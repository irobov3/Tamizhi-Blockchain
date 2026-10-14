import { StargateClient, SigningStargateClient, coins, DeliverTxResponse } from '@cosmjs/stargate';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_CHAIN_RPC || 'http://localhost:26657';
const REST_ENDPOINT = process.env.NEXT_PUBLIC_CHAIN_LCD || 'http://localhost:1317';
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 'tamizhi-1';
const DENOM = 'utmz';
const TMZ_PER_UTMZ = 1_000_000;
const DEFAULT_GAS_PRICE = '0.025utmz';

// ─── Keplr chain config ───────────────────────────────────────────────────────

const TAMIZHI_CHAIN_INFO = {
  chainId: CHAIN_ID,
  chainName: 'Tamizhi',
  rpc: RPC_ENDPOINT,
  rest: REST_ENDPOINT,
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: 'tamizhi',
    bech32PrefixAccPub: 'tamizhipub',
    bech32PrefixValAddr: 'tamizhi' + 'valoper',
    bech32PrefixValPub: 'tamizhi' + 'valoperpub',
    bech32PrefixConsAddr: 'tamizhi' + 'valcons',
    bech32PrefixConsPub: 'tamizhi' + 'valconspub',
  },
  currencies: [
    { coinDenom: 'TMZ', coinMinimalDenom: 'utmz', coinDecimals: 6, coinGeckoId: 'tamizhi' },
  ],
  feeCurrencies: [
    {
      coinDenom: 'TMZ',
      coinMinimalDenom: 'utmz',
      coinDecimals: 6,
      gasPriceStep: { low: 0.001, average: 0.025, high: 0.05 },
    },
  ],
  stakeCurrency: { coinDenom: 'TMZ', coinMinimalDenom: 'utmz', coinDecimals: 6 },
  features: ['stargate', 'ibc-transfer', 'cosmwasm'],
};

// ─── Keplr detection ─────────────────────────────────────────────────────────

export function isKeplrAvailable(): boolean {
  return typeof window !== 'undefined' && (!!window.keplr || !!window.leap);
}

function getKeplrProvider(): Keplr {
  const provider = window.keplr ?? window.leap;
  if (!provider) throw new Error('Keplr (or Leap) wallet extension not found. Please install it from keplr.app');
  return provider;
}

// ─── Keplr connect flow ──────────────────────────────────────────────────────

export interface KeplrConnectResult {
  address: string;
  name: string;
  pubKey: string;
}

/**
 * Full Keplr connection:
 * 1. Suggest the Tamizhi chain to Keplr (adds it if not known)
 * 2. Enable (prompt user to approve)
 * 3. Return the active account
 */
export async function connectKeplr(): Promise<KeplrConnectResult> {
  const keplr = getKeplrProvider();

  // Register chain if Keplr doesn't know it yet
  try {
    await keplr.experimentalSuggestChain(TAMIZHI_CHAIN_INFO);
  } catch {
    // Chain may already be registered — ignore error
  }

  await keplr.enable(CHAIN_ID);
  const key = await keplr.getKey(CHAIN_ID);

  return {
    address: key.bech32Address,
    name: key.name,
    pubKey: Buffer.from(key.pubKey).toString('hex'),
  };
}

/**
 * Get a SigningStargateClient backed by Keplr's signer.
 * The mnemonic is never exposed — Keplr signs inside the extension.
 */
export async function getKeplrSigningClient(): Promise<SigningStargateClient> {
  const keplr = getKeplrProvider();
  await keplr.enable(CHAIN_ID);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offlineSigner = keplr.getOfflineSigner(CHAIN_ID) as any;

  return SigningStargateClient.connectWithSigner(RPC_ENDPOINT, offlineSigner, {
    gasPrice: GasPrice.fromString(DEFAULT_GAS_PRICE),
  });
}

export interface SendTokensKeplrOptions {
  from: string;
  to: string;
  amount: string; // TMZ human-readable
  memo?: string;
}

/**
 * Send tokens signed by Keplr (no mnemonic in app memory).
 */
export async function sendTokensKeplr(options: SendTokensKeplrOptions): Promise<SendTokensResult> {
  const { from, to, amount, memo = '' } = options;
  const client = await getKeplrSigningClient();
  const utmzAmount = toUtmz(amount);
  const sendCoins = coins(utmzAmount, DENOM);

  const result: DeliverTxResponse = await client.sendTokens(from, to, sendCoins, 'auto', memo);

  if (result.code !== 0) {
    throw new Error(`Transaction failed: ${result.rawLog}`);
  }

  return {
    txHash: result.transactionHash,
    height: result.height,
    gasUsed: result.gasUsed ? Number(result.gasUsed) : 0,
    gasWanted: result.gasWanted ? Number(result.gasWanted) : 0,
  };
}

/**
 * Estimate gas for a Keplr send (uses Keplr signer for simulation).
 */
export async function estimateGasKeplr(from: string, to: string, amount: string, memo = ''): Promise<number> {
  try {
    const client = await getKeplrSigningClient();
    const utmzAmount = toUtmz(amount);
    const sendCoins = coins(utmzAmount, DENOM);
    const gas = await client.simulate(
      from,
      [{ typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: { fromAddress: from, toAddress: to, amount: sendCoins } }],
      memo
    );
    return Math.ceil(gas * 1.2);
  } catch {
    return 80_000;
  }
}

let stargateClient: StargateClient | null = null;

export async function getStargateClient(): Promise<StargateClient> {
  if (!stargateClient) {
    stargateClient = await StargateClient.connect(RPC_ENDPOINT);
  }
  return stargateClient;
}

export interface SigningClientResult {
  client: SigningStargateClient;
  signer: DirectSecp256k1HdWallet;
}

export async function getSigningClient(mnemonic: string): Promise<SigningClientResult> {
  const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'tamizhi',
  });

  const client = await SigningStargateClient.connectWithSigner(RPC_ENDPOINT, signer, {
    gasPrice: GasPrice.fromString(DEFAULT_GAS_PRICE),
  });

  return { client, signer };
}

export interface SendTokensOptions {
  from: string;
  to: string;
  amount: string; // in TMZ (human-readable)
  memo?: string;
  mnemonic: string;
}

export interface SendTokensResult {
  txHash: string;
  height: number;
  gasUsed: number;
  gasWanted: number;
}

export async function sendTokens(options: SendTokensOptions): Promise<SendTokensResult> {
  const { from, to, amount, memo = '', mnemonic } = options;

  const { client } = await getSigningClient(mnemonic);

  const utmzAmount = toUtmz(amount);
  const sendCoins = coins(utmzAmount, DENOM);

  const result: DeliverTxResponse = await client.sendTokens(from, to, sendCoins, 'auto', memo);

  if (result.code !== 0) {
    throw new Error(`Transaction failed with code ${result.code}: ${result.rawLog}`);
  }

  return {
    txHash: result.transactionHash,
    height: result.height,
    gasUsed: result.gasUsed ? Number(result.gasUsed) : 0,
    gasWanted: result.gasWanted ? Number(result.gasWanted) : 0,
  };
}

export interface Balance {
  tmz: string;
  utmz: string;
}

export async function getBalance(address: string): Promise<Balance> {
  const client = await getStargateClient();
  const coin = await client.getBalance(address, DENOM);
  const utmzAmount = BigInt(coin.amount || '0');

  return {
    utmz: utmzAmount.toString(),
    tmz: formatAmount(utmzAmount.toString()),
  };
}

export async function getBlockHeight(): Promise<number> {
  const client = await getStargateClient();
  const block = await client.getBlock();
  return block.header.height;
}

export async function getTransaction(txHash: string) {
  const client = await getStargateClient();
  return client.getTx(txHash);
}

export async function estimateGas(
  mnemonic: string,
  from: string,
  to: string,
  amount: string,
  memo = ''
): Promise<number> {
  try {
    const { client } = await getSigningClient(mnemonic);
    const utmzAmount = toUtmz(amount);
    const sendCoins = coins(utmzAmount, DENOM);

    const gasEstimate = await client.simulate(
      from,
      [
        {
          typeUrl: '/cosmos.bank.v1beta1.MsgSend',
          value: {
            fromAddress: from,
            toAddress: to,
            amount: sendCoins,
          },
        },
      ],
      memo
    );

    // Add 20% buffer
    return Math.ceil(gasEstimate * 1.2);
  } catch {
    return 80000; // Default gas estimate
  }
}

/**
 * Convert TMZ (human-readable) to utmz (micro)
 * e.g. "1.5" -> "1500000"
 */
export function toUtmz(tmz: string): string {
  const amount = parseFloat(tmz);
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid TMZ amount');
  }
  return Math.floor(amount * TMZ_PER_UTMZ).toString();
}

/**
 * Format utmz to TMZ human-readable string
 * e.g. "1500000" -> "1.500000"
 */
export function formatAmount(utmz: string): string {
  const amount = BigInt(utmz || '0');
  const tmz = Number(amount) / TMZ_PER_UTMZ;
  return tmz.toFixed(6);
}

/**
 * Validate a Tamizhi wallet address
 */
export function isValidAddress(address: string): boolean {
  return /^tamizhi1[a-z0-9]{38}$/.test(address);
}

/**
 * Generate a new wallet mnemonic
 */
export async function generateMnemonic(): Promise<string> {
  const wallet = await DirectSecp256k1HdWallet.generate(24, { prefix: 'tamizhi' });
  return wallet.mnemonic;
}

/**
 * Get address from mnemonic
 */
export async function getAddressFromMnemonic(mnemonic: string): Promise<string> {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'tamizhi',
  });
  const accounts = await wallet.getAccounts();
  return accounts[0].address;
}

/**
 * Broadcast a pre-signed transaction
 */
export async function broadcastTx(signedTxBytes: Uint8Array): Promise<DeliverTxResponse> {
  const client = await getStargateClient();
  return client.broadcastTx(signedTxBytes);
}

// ─── CosmWasm contract execution (Keplr) ─────────────────────────────────────

export interface MintWorkOptions {
  sender: string;
  tokenId: string;
  titleTamil: string;
  titleEnglish: string;
  author: string;
  ipfsCid: string;
  contentHash: string;
  license: string;
  genre: string;
  period: string;
  description?: string;
}

export interface MintWorkResult {
  txHash: string;
  height: number;
  gasUsed: number;
}

/**
 * Mint a Tamil literary work NFT via Keplr.
 * Requires NEXT_PUBLIC_NFT_CONTRACT to be set.
 */
export async function mintWorkKeplr(options: MintWorkOptions): Promise<MintWorkResult> {
  const contractAddr = process.env.NEXT_PUBLIC_NFT_CONTRACT;
  if (!contractAddr) throw new Error('NFT contract address not configured (NEXT_PUBLIC_NFT_CONTRACT)');

  const keplr = getKeplrProvider();
  await keplr.enable(CHAIN_ID);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offlineSigner = keplr.getOfflineSigner(CHAIN_ID) as any;

  const client = await SigningCosmWasmClient.connectWithSigner(RPC_ENDPOINT, offlineSigner, {
    gasPrice: GasPrice.fromString(DEFAULT_GAS_PRICE),
  });

  const msg = {
    mint_work: {
      token_id: options.tokenId,
      metadata: {
        title_tamil: options.titleTamil,
        title_english: options.titleEnglish,
        author: options.author,
        ipfs_cid: options.ipfsCid,
        content_hash: options.contentHash,
        license: options.license,
        genre: options.genre,
        period: options.period,
        description: options.description ?? '',
        size_bytes: 0,
        language: 'Tamil',
        tags: [],
      },
    },
  };

  const result = await client.execute(options.sender, contractAddr, msg, 'auto');

  if (!result.transactionHash) throw new Error('Mint transaction failed');

  return {
    txHash: result.transactionHash,
    height: result.height,
    gasUsed: result.gasUsed ? Number(result.gasUsed) : 0,
  };
}
