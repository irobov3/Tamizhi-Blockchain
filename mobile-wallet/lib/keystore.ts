/**
 * lib/keystore.ts
 * Shared keystore library for Tamizhi Wallet.
 *
 * Uses:
 *  - bip39 for mnemonic generation/validation
 *  - @cosmjs/proto-signing (DirectSecp256k1HdWallet) for key derivation with
 *    the Cosmos coin-type HD path m/44'/118'/0'/0/0
 *  - expo-secure-store for encrypted persistence
 *  - @cosmjs/stargate (SigningStargateClient) for signing/broadcasting
 *
 * Encryption scheme: SHA-256-keystream XOR (testnet-grade).
 * Production builds should upgrade to Argon2id + AES-GCM.
 */

import * as bip39Lib from 'bip39';
import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';

// ─── Constants ────────────────────────────────────────────────────────────────

const BECH32_PREFIX = 'tamizhi';
const HD_PATH = "m/44'/118'/0'/0/0";
const STORAGE_KEY = 'tamizhi_wallet_mnemonic';
const DEFAULT_GAS_PRICE = '0.025utmz';

// ─── Internal helpers ─────────────────────────────────────────────────────────

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

/** UTF-8 encode without TextEncoder (Hermes-safe). */
const utf8Encode = (s: string): Uint8Array => {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      i++;
      const c2 = s.charCodeAt(i);
      const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
};

/** UTF-8 decode without TextDecoder (Hermes-safe). */
const utf8Decode = (bytes: Uint8Array): string => {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (b < 0xf0) {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f),
      );
    } else {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i++] & 0x3f) << 12) |
        ((bytes[i++] & 0x3f) << 6) |
        (bytes[i++] & 0x3f);
      const surrogate = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (surrogate >> 10), 0xdc00 + (surrogate & 0x3ff));
    }
  }
  return out;
};

/**
 * Derive a keystream by repeatedly hashing SHA-256(pin || "::" || saltHex || "::" || counter).
 * Simple but deterministic — same PIN + salt always yields same keystream.
 */
async function deriveKeystream(pin: string, salt: Uint8Array, length: number): Promise<Uint8Array> {
  const out = new Uint8Array(length);
  const saltHex = toHex(salt);
  let offset = 0;
  let counter = 0;

  while (offset < length) {
    const digestHex = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      `${pin}::${saltHex}::${counter}`,
    );
    const block = fromHex(digestHex);
    const take = Math.min(block.length, length - offset);
    out.set(block.subarray(0, take), offset);
    offset += take;
    counter++;
  }
  return out;
}

interface EncryptedBlob {
  v: 1;
  salt: string; // hex
  ct: string;   // hex ciphertext
}

async function encryptWithPin(plaintext: string, pin: string): Promise<string> {
  const plain = utf8Encode(plaintext);
  const salt = await ExpoCrypto.getRandomBytesAsync(16);
  const keystream = await deriveKeystream(pin, salt, plain.length);
  const ct = new Uint8Array(plain.length);
  for (let i = 0; i < plain.length; i++) ct[i] = plain[i] ^ keystream[i];
  const blob: EncryptedBlob = { v: 1, salt: toHex(salt), ct: toHex(ct) };
  return JSON.stringify(blob);
}

async function decryptWithPin(blobStr: string, pin: string): Promise<string> {
  const blob = JSON.parse(blobStr) as EncryptedBlob;
  if (blob.v !== 1) throw new Error('Unknown keystore version');
  const salt = fromHex(blob.salt);
  const ct = fromHex(blob.ct);
  const keystream = await deriveKeystream(pin, salt, ct.length);
  const pt = new Uint8Array(ct.length);
  for (let i = 0; i < ct.length; i++) pt[i] = ct[i] ^ keystream[i];
  return utf8Decode(pt);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a new 24-word BIP39 mnemonic (256 bits of entropy).
 */
export function generateMnemonic(): string {
  return bip39Lib.generateMnemonic(256);
}

/**
 * Validate a BIP39 mnemonic string.
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39Lib.validateMnemonic(mnemonic.trim());
}

/**
 * Encrypt the mnemonic with the given PIN and persist to expo-secure-store.
 */
export async function storeMnemonic(mnemonic: string, pin: string): Promise<void> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }
  const encrypted = await encryptWithPin(mnemonic.trim(), pin);
  await SecureStore.setItemAsync(STORAGE_KEY, encrypted);
}

/**
 * Decrypt and return the stored mnemonic using the given PIN.
 * Throws if PIN is wrong or no mnemonic is stored.
 */
export async function loadMnemonic(pin: string): Promise<string> {
  const blob = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!blob) throw new Error('No wallet found. Please create or import one.');
  const mnemonic = await decryptWithPin(blob, pin);
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Wrong PIN or corrupted wallet data');
  }
  return mnemonic;
}

/**
 * Returns true if a mnemonic blob is persisted in secure storage.
 */
export async function hasMnemonic(): Promise<boolean> {
  const blob = await SecureStore.getItemAsync(STORAGE_KEY);
  return blob !== null && blob.length > 0;
}

/**
 * Clear the stored mnemonic from secure storage.
 */
export async function clearMnemonic(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

/**
 * Derive the tamizhi1... bech32 address from a BIP39 mnemonic.
 * Uses HD path m/44'/118'/0'/0/0 (Cosmos coin type 118).
 */
export async function getAddress(mnemonic: string): Promise<string> {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic.trim(), {
    prefix: BECH32_PREFIX,
    hdPaths: [stringToPath(HD_PATH)],
  });
  const accounts = await wallet.getAccounts();
  if (!accounts.length) throw new Error('Failed to derive account from mnemonic');
  return accounts[0].address;
}

/**
 * Build a CosmJS SigningStargateClient ready to sign and broadcast transactions.
 * Returns both the client and the derived address.
 */
export async function getSigningClient(
  mnemonic: string,
  rpcUrl: string,
): Promise<{ client: SigningStargateClient; address: string }> {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic.trim(), {
    prefix: BECH32_PREFIX,
    hdPaths: [stringToPath(HD_PATH)],
  });
  const accounts = await wallet.getAccounts();
  if (!accounts.length) throw new Error('Failed to derive account');
  const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet, {
    gasPrice: GasPrice.fromString(DEFAULT_GAS_PRICE),
  });
  return { client, address: accounts[0].address };
}
