import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import * as Crypto from 'expo-crypto';
import { ed25519 } from '@noble/curves/ed25519';

export interface SessionIdentity {
  publicKey: string;   // hex - Ed25519 public key (Tamizhi ID)
  privateKey: string;  // hex - 32-byte Ed25519 seed
  walletAddress: string;
  displayName?: string;
}

/**
 * Generate a deterministic identity from a wallet mnemonic.
 * Seed = SHA-256(mnemonic + domain_separator)
 * Public key = Ed25519 public key from seed
 */
export async function generateSessionIdentity(
  mnemonic: string,
  walletAddress: string,
): Promise<SessionIdentity> {
  const hashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    mnemonic + ':tamizhi-session-v1',
  );
  const seed = new Uint8Array(Buffer.from(hashHex, 'hex'));
  const keyPair = nacl.sign.keyPair.fromSeed(seed);

  const identity: SessionIdentity = {
    publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
    privateKey: Buffer.from(seed).toString('hex'),
    walletAddress,
  };

  await SecureStore.setItemAsync('session_identity', JSON.stringify(identity));
  return identity;
}

export async function getStoredIdentity(): Promise<SessionIdentity | null> {
  try {
    const stored = await SecureStore.getItemAsync('session_identity');
    return stored ? (JSON.parse(stored) as SessionIdentity) : null;
  } catch {
    return null;
  }
}

export async function updateStoredIdentity(
  updates: Partial<SessionIdentity>,
): Promise<void> {
  const existing = await getStoredIdentity();
  if (!existing) throw new Error('No stored identity to update');
  const updated = { ...existing, ...updates };
  await SecureStore.setItemAsync('session_identity', JSON.stringify(updated));
}

export async function clearStoredIdentity(): Promise<void> {
  await SecureStore.deleteItemAsync('session_identity');
  await SecureStore.deleteItemAsync('wallet_mnemonic');
}

// ─── Encryption ────────────────────────────────────────────────────────────

/**
 * Convert Ed25519 public key to X25519 (Curve25519) public key.
 * Uses @noble/curves which implements the proper birational equivalence.
 */
function ed25519PubToX25519(ed25519PubHex: string): Uint8Array {
  const edPub = Buffer.from(ed25519PubHex, 'hex');
  return ed25519.utils.convertPublicKeyToX25519(edPub);
}

/**
 * Convert Ed25519 seed (private key) to X25519 secret key.
 */
function ed25519SeedToX25519Secret(seedHex: string): Uint8Array {
  const seed = Buffer.from(seedHex, 'hex');
  return ed25519.utils.convertSecretKeyToX25519(seed);
}

/**
 * Encrypt a message for a recipient.
 * Uses X25519-XSalsa20-Poly1305 (NaCl box).
 */
export function encryptMessage(
  message: string,
  recipientPubKeyHex: string,
  senderSeedHex: string,
): { encrypted: string; nonce: string } {
  const recipientX25519 = ed25519PubToX25519(recipientPubKeyHex);
  const senderX25519Secret = ed25519SeedToX25519Secret(senderSeedHex);

  // Derive sender X25519 public key for box
  const senderBoxKeyPair = nacl.box.keyPair.fromSecretKey(senderX25519Secret);

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = new TextEncoder().encode(message);

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientX25519,
    senderBoxKeyPair.secretKey,
  );

  return {
    encrypted: Buffer.from(encrypted).toString('base64'),
    nonce: Buffer.from(nonce).toString('base64'),
  };
}

/**
 * Decrypt a message received from a sender.
 */
export function decryptMessage(
  encryptedB64: string,
  nonceB64: string,
  senderPubKeyHex: string,
  recipientSeedHex: string,
): string | null {
  try {
    const senderX25519 = ed25519PubToX25519(senderPubKeyHex);
    const recipientX25519Secret = ed25519SeedToX25519Secret(recipientSeedHex);
    const recipientBoxKeyPair = nacl.box.keyPair.fromSecretKey(recipientX25519Secret);

    const encrypted = Buffer.from(encryptedB64, 'base64');
    const nonce = Buffer.from(nonceB64, 'base64');

    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      senderX25519,
      recipientBoxKeyPair.secretKey,
    );

    if (!decrypted) return null;
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/** Format a Tamizhi ID for display (abbreviated). */
export function formatTamizhiId(pubKeyHex: string): string {
  if (pubKeyHex.length < 16) return pubKeyHex;
  return `${pubKeyHex.slice(0, 8)}...${pubKeyHex.slice(-8)}`;
}
