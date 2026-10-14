import * as bip39 from 'bip39';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';

const BECH32_PREFIX = 'tamizhi';
const DEFAULT_HD_PATH = "m/44'/118'/0'/0/0"; // Cosmos coin type
const STORAGE_KEY = 'tamizhi_wallet_v1';

// ─── Mnemonic generation / validation ────────────────────────────────────

export function generateMnemonic(): string {
  // 256 bits of entropy → 24 words
  return bip39.generateMnemonic(256);
}

export function validateMnemonic(mnemonic: string): boolean {
  if (!mnemonic) return false;
  return bip39.validateMnemonic(mnemonic.trim());
}

// ─── Account derivation ──────────────────────────────────────────────────

export interface DerivedAccount {
  address: string;
  wallet: DirectSecp256k1HdWallet;
}

export async function deriveAccount(
  mnemonic: string,
  hdPath: string = DEFAULT_HD_PATH,
): Promise<DerivedAccount> {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic.trim(), {
    prefix: BECH32_PREFIX,
    hdPaths: [stringToPath(hdPath)],
  });
  const accounts = await wallet.getAccounts();
  if (!accounts.length) throw new Error('Failed to derive account');
  return { address: accounts[0].address, wallet };
}

// ─── PIN-based encryption (testnet-grade) ────────────────────────────────
// NOTE: This is a simple SHA-256-keystream XOR cipher. It is intended for
// testnet builds only. Production builds should use Argon2id + AES-GCM.

interface EncryptedBlob {
  v: 1;
  salt: string; // hex
  ct: string; // hex ciphertext
}

const utf8 = (s: string) => {
  // Polyfill-friendly UTF-8 encoder
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
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

const fromUtf8 = (bytes: Uint8Array): string => {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b < 0xf0) {
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

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

async function deriveKeystream(pin: string, salt: Uint8Array, length: number): Promise<Uint8Array> {
  // Concatenate SHA-256(pin || salt || counter) blocks until length reached.
  const out = new Uint8Array(length);
  let offset = 0;
  let counter = 0;
  const saltHex = toHex(salt);
  while (offset < length) {
    const digestHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
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

export async function encryptMnemonic(mnemonic: string, pin: string): Promise<string> {
  const plain = utf8(mnemonic);
  const salt = await Crypto.getRandomBytesAsync(16);
  const keystream = await deriveKeystream(pin, salt, plain.length);
  const ct = new Uint8Array(plain.length);
  for (let i = 0; i < plain.length; i++) ct[i] = plain[i] ^ keystream[i];
  const blob: EncryptedBlob = { v: 1, salt: toHex(salt), ct: toHex(ct) };
  return JSON.stringify(blob);
}

export async function decryptMnemonic(blob: string, pin: string): Promise<string> {
  const parsed = JSON.parse(blob) as EncryptedBlob;
  if (parsed.v !== 1) throw new Error('Unknown keystore version');
  const salt = fromHex(parsed.salt);
  const ct = fromHex(parsed.ct);
  const keystream = await deriveKeystream(pin, salt, ct.length);
  const pt = new Uint8Array(ct.length);
  for (let i = 0; i < ct.length; i++) pt[i] = ct[i] ^ keystream[i];
  const mnemonic = fromUtf8(pt);
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid PIN or corrupted keystore');
  }
  return mnemonic;
}

// ─── Secure storage ──────────────────────────────────────────────────────

export async function saveEncrypted(blob: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, blob);
}

export async function loadEncrypted(): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEY);
}

export async function clearEncrypted(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
