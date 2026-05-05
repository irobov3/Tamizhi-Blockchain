import { create } from "zustand";
import { loadKey, saveKey } from "./persist";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

// Encrypted keystore using WebCrypto AES-GCM with PBKDF2-derived key.
// We store only the encrypted blob; the mnemonic is decrypted in-memory on unlock.

interface EncryptedKeystore {
  version: 1;
  salt: string;     // base64
  iv: string;       // base64
  ciphertext: string; // base64
  prefix: string;   // bech32 prefix for derived addresses
}

const KEY = "wallet/keystore/v1";

interface WalletState {
  keystore: EncryptedKeystore | null;
  hydrated: boolean;
  unlocked: boolean;
  address: string | null;
  // In-memory only (cleared on lock).
  _wallet: DirectSecp256k1HdWallet | null;

  hydrate: () => Promise<void>;
  create: (mnemonic: string, password: string, prefix?: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  hasWallet: () => boolean;
  getWallet: () => DirectSecp256k1HdWallet | null;
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 250_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptMnemonic(mnemonic: string, password: string, prefix: string): Promise<EncryptedKeystore> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(mnemonic) as BufferSource,
  );
  return {
    version: 1,
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(ct),
    prefix,
  };
}

async function decryptMnemonic(ks: EncryptedKeystore, password: string): Promise<string> {
  const key = await deriveKey(password, unb64(ks.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ks.iv) as BufferSource },
    key,
    unb64(ks.ciphertext) as BufferSource,
  );
  return new TextDecoder().decode(pt);
}

export const useWallet = create<WalletState>((set, get) => ({
  keystore: null,
  hydrated: false,
  unlocked: false,
  address: null,
  _wallet: null,

  hydrate: async () => {
    const keystore = await loadKey<EncryptedKeystore | null>(KEY, null);
    set({ keystore, hydrated: true });
  },

  hasWallet: () => !!get().keystore,

  create: async (mnemonic, password, prefix = "tamizhi") => {
    const ks = await encryptMnemonic(mnemonic, password, prefix);
    await saveKey(KEY, ks);
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix });
    const [account] = await wallet.getAccounts();
    set({ keystore: ks, _wallet: wallet, unlocked: true, address: account.address });
  },

  unlock: async (password) => {
    const ks = get().keystore;
    if (!ks) throw new Error("No wallet to unlock");
    const mnemonic = await decryptMnemonic(ks, password);
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: ks.prefix });
    const [account] = await wallet.getAccounts();
    set({ _wallet: wallet, unlocked: true, address: account.address });
  },

  lock: () => set({ _wallet: null, unlocked: false, address: null }),

  getWallet: () => get()._wallet,
}));
