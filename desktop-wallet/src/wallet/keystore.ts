// Encrypted keystore for the desktop wallet.
//
// Storage layer:
//   - Uses @tauri-apps/plugin-store when running inside the Tauri shell
//     (persists into the OS-specific app-data dir).
//   - Falls back to localStorage for `npm run dev` browser preview.
//
// Crypto:
//   - Real CosmJS DirectSecp256k1HdWallet for signing.
//   - We rely on CosmJS's built-in `serializeWithEncryptionKey()` /
//     `deserializeWithEncryptionKey()` (PBKDF2 + AES-256 GCM) so we never
//     keep plaintext mnemonics on disk.

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

const STORE_FILE = "tamizhi-wallets.json";
const STORE_KEY = "wallets";

export type StoredWalletMeta = {
  id: string;
  name: string;
  address: string;
  prefix: string;
  createdAt: number;
  /** CosmJS encrypted serialization (JSON string). */
  encrypted: string;
};

type StoreShape = { wallets: StoredWalletMeta[] };

// ---- Storage abstraction --------------------------------------------------

type StoreLike = {
  get<T>(k: string): Promise<T | null>;
  set(k: string, v: unknown): Promise<void>;
  save(): Promise<void>;
};

async function getStore(): Promise<StoreLike> {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (isTauri) {
    try {
      const mod = await import("@tauri-apps/plugin-store");
      // Tauri 2 plugin-store v2: `Store.load(path)` is the canonical API.
      // Older typings exposed `createStore`; both end up returning a Store.
      const anyMod = mod as any;
      if (typeof anyMod.load === "function") {
        return await anyMod.load(STORE_FILE);
      }
      if (anyMod.Store?.load) return await anyMod.Store.load(STORE_FILE);
      if (typeof anyMod.createStore === "function") return anyMod.createStore(STORE_FILE);
      if (anyMod.Store) return new anyMod.Store(STORE_FILE);
    } catch (err) {
      console.warn("plugin-store unavailable, falling back to localStorage", err);
    }
  }
  // localStorage fallback
  return {
    async get<T>(k: string) {
      const raw = localStorage.getItem(`${STORE_FILE}:${k}`);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async set(k: string, v: unknown) {
      localStorage.setItem(`${STORE_FILE}:${k}`, JSON.stringify(v));
    },
    async save() {
      /* noop */
    },
  };
}

async function readAll(): Promise<StoredWalletMeta[]> {
  const store = await getStore();
  const data = (await store.get<StoreShape>(STORE_KEY)) ?? { wallets: [] };
  return data.wallets ?? [];
}

async function writeAll(wallets: StoredWalletMeta[]): Promise<void> {
  const store = await getStore();
  await store.set(STORE_KEY, { wallets });
  await store.save();
}

// ---- Public API -----------------------------------------------------------

export async function listWallets(): Promise<StoredWalletMeta[]> {
  return readAll();
}

export async function generateMnemonic(strength: 12 | 24 = 24): Promise<string> {
  // CosmJS uses 256-bit entropy => 24 words; 128-bit => 12 words.
  const wallet = await DirectSecp256k1HdWallet.generate(strength === 12 ? 12 : 24, {
    prefix: "tamizhi",
  });
  return wallet.mnemonic;
}

export async function createWallet(opts: {
  name: string;
  mnemonic: string;
  password: string;
  prefix?: string;
}): Promise<StoredWalletMeta> {
  const prefix = opts.prefix ?? "tamizhi";
  // Default Cosmos HD path m/44'/118'/0'/0/0 is built-in to fromMnemonic.
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(opts.mnemonic.trim(), {
    prefix,
  });
  const [account] = await wallet.getAccounts();
  const encrypted = await wallet.serializeWithEncryptionKey(
    await deriveKey(opts.password)
  );
  const meta: StoredWalletMeta = {
    id: `w_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    name: opts.name,
    address: account.address,
    prefix,
    createdAt: Date.now(),
    encrypted,
  };
  const all = await readAll();
  all.push(meta);
  await writeAll(all);
  return meta;
}

export async function unlockWallet(
  id: string,
  password: string
): Promise<DirectSecp256k1HdWallet> {
  const all = await readAll();
  const meta = all.find((w) => w.id === id);
  if (!meta) throw new Error("Wallet not found");
  const key = await deriveKey(password);
  return DirectSecp256k1HdWallet.deserializeWithEncryptionKey(meta.encrypted, key);
}

export async function renameWallet(id: string, name: string): Promise<void> {
  const all = await readAll();
  const meta = all.find((w) => w.id === id);
  if (!meta) return;
  meta.name = name;
  await writeAll(all);
}

export async function deleteWallet(id: string): Promise<void> {
  const all = (await readAll()).filter((w) => w.id !== id);
  await writeAll(all);
}

export async function exportMnemonic(id: string, password: string): Promise<string> {
  const w = await unlockWallet(id, password);
  return w.mnemonic;
}

// ---- Key derivation -------------------------------------------------------
//
// CosmJS's `serializeWithEncryptionKey` expects a 32-byte key. We derive it
// from the password using PBKDF2-SHA256 via WebCrypto (available in both the
// Tauri WebView and Node/browser dev). 600k iterations matches OWASP 2023
// guidance for PBKDF2-SHA256 with PIN-strength inputs.

const SALT = new TextEncoder().encode("tamizhi-wallet-keystore-v1");

async function deriveKey(password: string): Promise<Uint8Array> {
  if (!password) throw new Error("Password required");
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto not available");
  const baseKey = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: SALT, iterations: 600_000 },
    baseKey,
    256
  );
  return new Uint8Array(bits);
}
