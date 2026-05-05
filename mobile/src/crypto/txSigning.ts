/**
 * Transaction signing for Tamizhi blockchain.
 * Uses CosmJS DirectSecp256k1HdWallet for proper Cosmos SDK signing.
 */
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient, StargateClient, coins } from '@cosmjs/stargate';
import { CONFIG } from '../config';

const RPC_URL = CONFIG.CHAIN_REST_URL.replace(':1317', ':26657');

/**
 * Get a signing client from mnemonic.
 */
export async function getSigningClient(mnemonic: string) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'tamizhi',
  });
  const [account] = await wallet.getAccounts();
  const client = await SigningStargateClient.connectWithSigner(RPC_URL, wallet);
  return { client, address: account.address };
}

/**
 * Get read-only client for queries.
 */
export async function getQueryClient() {
  return StargateClient.connect(RPC_URL);
}

/**
 * Send TMZ tokens from mnemonic-derived wallet to recipient.
 */
export async function sendTokens(
  mnemonic: string,
  recipientAddress: string,
  amountTMZ: number,
  memo: string = '',
): Promise<{ txHash: string; success: boolean; error?: string }> {
  try {
    const { client, address } = await getSigningClient(mnemonic);

    // Convert TMZ to utmz (1 TMZ = 1,000,000 utmz)
    const utmzAmount = Math.floor(amountTMZ * 1_000_000).toString();
    const fee = {
      amount: coins(2000, CONFIG.DENOM),
      gas: '200000',
    };

    const result = await client.sendTokens(
      address,
      recipientAddress,
      coins(utmzAmount, CONFIG.DENOM),
      fee,
      memo,
    );

    return { txHash: result.transactionHash, success: true };
  } catch (err: any) {
    return { txHash: '', success: false, error: err?.message ?? 'Transaction failed' };
  }
}

/**
 * Get real wallet address from mnemonic using CosmJS.
 */
export async function getWalletAddress(mnemonic: string): Promise<string> {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'tamizhi',
  });
  const [account] = await wallet.getAccounts();
  return account.address;
}

/**
 * Get balance for an address.
 */
export async function getAddressBalance(address: string): Promise<string> {
  try {
    const client = await getQueryClient();
    const balance = await client.getBalance(address, CONFIG.DENOM);
    return balance ? balance.amount : '0';
  } catch {
    return '0';
  }
}
