import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface EncryptedMessage {
  ciphertext: string; // base64
  nonce: string;      // base64
  senderPublicKey: string; // hex
}

/**
 * Generate a new NaCl box key pair for E2E encryption
 */
export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

/**
 * Generate key pair from a seed (deterministic, derived from wallet secret)
 */
export function generateKeyPairFromSeed(seed: Uint8Array): KeyPair {
  return nacl.box.keyPair.fromSecretKey(seed.slice(0, 32));
}

/**
 * Encrypt a message using NaCl box (X25519-XSalsa20-Poly1305)
 * @param message - plaintext string
 * @param recipientPublicKey - recipient's X25519 public key (hex or Uint8Array)
 * @param senderSecretKey - sender's X25519 secret key (Uint8Array)
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: Uint8Array | string,
  senderSecretKey: Uint8Array
): EncryptedMessage {
  const recipientPubKeyBytes =
    typeof recipientPublicKey === 'string'
      ? importKey(recipientPublicKey)
      : recipientPublicKey;

  const senderKeyPair = nacl.box.keyPair.fromSecretKey(senderSecretKey);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = decodeUTF8(message);

  const ciphertext = nacl.box(messageBytes, nonce, recipientPubKeyBytes, senderSecretKey);

  if (!ciphertext) {
    throw new Error('Encryption failed');
  }

  return {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
    senderPublicKey: exportKey(senderKeyPair.publicKey),
  };
}

/**
 * Decrypt a message using NaCl box
 * @param encrypted - EncryptedMessage object
 * @param senderPublicKey - sender's X25519 public key (hex or Uint8Array)
 * @param recipientSecretKey - recipient's X25519 secret key (Uint8Array)
 */
export function decryptMessage(
  encrypted: EncryptedMessage,
  senderPublicKey: Uint8Array | string,
  recipientSecretKey: Uint8Array
): string {
  const senderPubKeyBytes =
    typeof senderPublicKey === 'string'
      ? importKey(senderPublicKey)
      : senderPublicKey;

  const ciphertextBytes = decodeBase64(encrypted.ciphertext);
  const nonceBytes = decodeBase64(encrypted.nonce);

  const decrypted = nacl.box.open(ciphertextBytes, nonceBytes, senderPubKeyBytes, recipientSecretKey);

  if (!decrypted) {
    throw new Error('Decryption failed — message may be corrupted or keys incorrect');
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Export a key (Uint8Array) to hex string
 */
export function exportKey(key: Uint8Array): string {
  return Array.from(key)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Import a hex string to Uint8Array
 */
export function importKey(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Generate a random nonce for signing
 */
export function generateNonce(): string {
  return exportKey(nacl.randomBytes(32));
}

/**
 * Sign a message using NaCl sign (Ed25519)
 */
export function signMessage(message: string, secretKey: Uint8Array): string {
  const messageBytes = decodeUTF8(message);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return exportKey(signature);
}

/**
 * Verify a signed message
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: Uint8Array | string
): boolean {
  const pubKeyBytes =
    typeof publicKey === 'string' ? importKey(publicKey) : publicKey;
  const messageBytes = decodeUTF8(message);
  const signatureBytes = importKey(signature);
  return nacl.sign.detached.verify(messageBytes, signatureBytes, pubKeyBytes);
}

/**
 * Hash data using SHA-256 (via subtle crypto)
 */
export async function sha256(data: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive an encryption key pair from a wallet mnemonic's entropy
 * (Use a proper KDF in production — this is simplified)
 */
export async function deriveKeyPairFromMnemonic(mnemonic: string): Promise<KeyPair> {
  const hash = await sha256(mnemonic + 'tamizhi_chat_v1');
  const seed = importKey(hash);
  return generateKeyPairFromSeed(seed);
}
