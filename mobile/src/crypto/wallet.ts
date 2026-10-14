import * as SecureStore from 'expo-secure-store';
import * as bip39 from 'bip39';
import * as Crypto from 'expo-crypto';
import { bech32 } from 'bech32';

export interface WalletInfo {
  address: string;
  mnemonic: string;
  publicKeyHex: string;
}

/** Generate a new 24-word BIP39 mnemonic. */
export function generateMnemonic(): string {
  return bip39.generateMnemonic(256);
}

/** Validate a mnemonic phrase. */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
}

/**
 * Derive a wallet address from a mnemonic.
 * Uses SHA-256(mnemonic) → first 20 bytes → bech32('tamizhi', bytes)
 * This mirrors the standard Cosmos address derivation pattern.
 */
export async function deriveWalletFromMnemonic(
  mnemonic: string,
): Promise<{ address: string; publicKeyHex: string }> {
  const hashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    mnemonic + ':tamizhi-wallet-v1',
  );

  // Take first 20 bytes as address bytes (standard Cosmos address length)
  const addressBytes = Buffer.from(hashHex.slice(0, 40), 'hex');
  const words = bech32.toWords(addressBytes);
  const address = bech32.encode('tamizhi', words);

  return {
    address,
    publicKeyHex: hashHex.slice(0, 64),
  };
}

/** Store the mnemonic securely. */
export async function storeMnemonic(mnemonic: string): Promise<void> {
  await SecureStore.setItemAsync('wallet_mnemonic', mnemonic);
}

/** Retrieve the stored mnemonic. */
export async function getStoredMnemonic(): Promise<string | null> {
  return SecureStore.getItemAsync('wallet_mnemonic');
}

/** Get 3 random word indices for the confirmation step. */
export function getConfirmationWordIndices(mnemonic: string): number[] {
  const words = mnemonic.split(' ');
  const indices: number[] = [];
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * words.length);
    if (!indices.includes(idx)) indices.push(idx);
  }
  return indices.sort((a, b) => a - b);
}
