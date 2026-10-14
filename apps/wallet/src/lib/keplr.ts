import { SigningStargateClient, StargateClient, GasPrice, coin } from '@cosmjs/stargate';

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.tamizhi.ai';

// ─── Chain info ───────────────────────────────────────────────────────────────

export const TAMIZHI_CHAIN_INFO = {
  chainId: 'tamizhi-testnet-1',
  chainName: 'Tamizhi Testnet',
  rpc: 'https://rpc.tamizhi.ai',
  rest: 'https://api.tamizhi.ai',
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: 'tamizhi',
    bech32PrefixAccPub: 'tamizhipub',
    bech32PrefixValAddr: 'tamizhivaloper',
    bech32PrefixValPub: 'tamizhivaloperpub',
    bech32PrefixConsAddr: 'tamizhivalcons',
    bech32PrefixConsPub: 'tamizhivalconspub',
  },
  currencies: [{ coinDenom: 'TMZ', coinMinimalDenom: 'utmz', coinDecimals: 6 }],
  feeCurrencies: [
    {
      coinDenom: 'TMZ',
      coinMinimalDenom: 'utmz',
      coinDecimals: 6,
      gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 },
    },
  ],
  stakeCurrency: { coinDenom: 'TMZ', coinMinimalDenom: 'utmz', coinDecimals: 6 },
};

// ─── Type declaration ─────────────────────────────────────────────────────────

declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      experimentalSuggestChain: (chainInfo: any) => Promise<void>;
      getKey: (chainId: string) => Promise<{ bech32Address: string; name: string }>;
      getOfflineSigner: (chainId: string) => any;
      getOfflineSignerOnlyAmino: (chainId: string) => any;
    };
    leap?: {
      enable: (chainId: string) => Promise<void>;
      experimentalSuggestChain: (chainInfo: any) => Promise<void>;
      getKey: (chainId: string) => Promise<{ bech32Address: string; name: string }>;
      getOfflineSigner: (chainId: string) => any;
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isKeplrAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.keplr;
}

function getWallet() {
  if (typeof window === 'undefined') throw new Error('Not in browser environment');
  const wallet = window.keplr ?? window.leap;
  if (!wallet) throw new Error('Keplr wallet not found. Please install the Keplr extension.');
  return wallet;
}

async function suggestAndEnable(): Promise<void> {
  const wallet = getWallet();
  try {
    await wallet.experimentalSuggestChain(TAMIZHI_CHAIN_INFO);
  } catch {
    // Chain may already be registered — ignore
  }
  await wallet.enable(TAMIZHI_CHAIN_INFO.chainId);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function connectKeplr(): Promise<string> {
  await suggestAndEnable();
  const wallet = getWallet();
  const key = await wallet.getKey(TAMIZHI_CHAIN_INFO.chainId);
  return key.bech32Address;
}

export async function getSigningClient(): Promise<{ client: SigningStargateClient; address: string }> {
  await suggestAndEnable();
  const wallet = getWallet();
  const key = await wallet.getKey(TAMIZHI_CHAIN_INFO.chainId);
  const signer = wallet.getOfflineSigner(TAMIZHI_CHAIN_INFO.chainId);
  const client = await SigningStargateClient.connectWithSigner(RPC, signer, {
    gasPrice: GasPrice.fromString('0.025utmz'),
  });
  return { client, address: key.bech32Address };
}

export async function sendTokens(
  from: string,
  to: string,
  amount: string, // in utmz
  memo = '',
): Promise<string> {
  const { client, address } = await getSigningClient();
  if (address !== from) throw new Error('Signer address does not match "from" address');

  const result = await client.sendTokens(
    from,
    to,
    [coin(amount, 'utmz')],
    'auto',
    memo,
  );

  if (result.code !== 0) {
    throw new Error((result as any).rawLog ?? `Transaction failed (code ${result.code})`);
  }
  return result.transactionHash;
}

export async function delegate(
  delegator: string,
  validator: string,
  amount: string, // in utmz
): Promise<string> {
  const { client, address } = await getSigningClient();
  if (address !== delegator) throw new Error('Signer address mismatch');

  const result = await client.delegateTokens(
    delegator,
    validator,
    coin(amount, 'utmz'),
    'auto',
  );

  if (result.code !== 0) {
    throw new Error((result as any).rawLog ?? `Delegation failed (code ${result.code})`);
  }
  return result.transactionHash;
}

export async function claimRewards(
  delegator: string,
  validators: string[],
): Promise<string> {
  const { client, address } = await getSigningClient();
  if (address !== delegator) throw new Error('Signer address mismatch');

  const msgs = validators.map((validatorAddress) => ({
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: { delegatorAddress: delegator, validatorAddress },
  }));

  const result = await client.signAndBroadcast(delegator, msgs, 'auto');

  if (result.code !== 0) {
    throw new Error((result as any).rawLog ?? `Claim rewards failed (code ${result.code})`);
  }
  return result.transactionHash;
}
