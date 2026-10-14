import nacl from 'tweetnacl';
import { fromHex, toHex } from '@cosmjs/encoding';
import { Secp256k1, sha256 } from '@cosmjs/crypto';
import type { TamizhiIdentity } from '../identity/keypair';

/**
 * An encrypted message produced by encryptMessage.
 * The ephemeral sender keypair changes each time, making messages unlinkable.
 */
export interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;          // 24 bytes, random per message
  ephemeralPublicKey: Uint8Array; // 32 bytes X25519, fresh per message
  senderAddress: string;      // wallet address of sender (authenticated separately)
  version: 'tmz-1';
}

/**
 * A single layer of onion-encrypted payload.
 */
export interface OnionLayer {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  ephemeralPublicKey: Uint8Array; // X25519
}

/**
 * Serialized form of EncryptedMessage for wire transport.
 */
export interface EncryptedMessageWire {
  ciphertext: string;         // hex
  nonce: string;              // hex
  ephemeralPublicKey: string; // hex
  senderAddress: string;
  version: 'tmz-1';
}

/**
 * Encrypt a plaintext string for a recipient.
 * Uses a fresh ephemeral X25519 keypair so each ciphertext is unlinkable to the sender's long-term key.
 * Encryption: NaCl box (X25519 key exchange + XSalsa20-Poly1305)
 */
export function encryptMessage(
  plaintext: string,
  senderIdentity: TamizhiIdentity,
  recipientPublicKey: Uint8Array
): EncryptedMessage {
  // Generate a fresh ephemeral keypair per message
  const ephemeralKeypair = nacl.box.keyPair();

  // Random 24-byte nonce
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // Encode plaintext as UTF-8 bytes
  const message = new TextEncoder().encode(plaintext);

  // NaCl box: encrypt using ephemeral secret key + recipient's X25519 public key
  const ciphertext = nacl.box(message, nonce, recipientPublicKey, ephemeralKeypair.secretKey);

  return {
    ciphertext,
    nonce,
    ephemeralPublicKey: ephemeralKeypair.publicKey,
    senderAddress: senderIdentity.walletAddress,
    version: 'tmz-1',
  };
}

/**
 * Decrypt a message using the recipient's X25519 secret key.
 * Recovers plaintext from the ephemeral public key embedded in the ciphertext.
 */
export function decryptMessage(
  encrypted: EncryptedMessage,
  recipientIdentity: TamizhiIdentity
): string {
  // NaCl box open: decrypt using recipient's secret key + ephemeral public key
  const plaintext = nacl.box.open(
    encrypted.ciphertext,
    encrypted.nonce,
    encrypted.ephemeralPublicKey,
    recipientIdentity.x25519SecretKey
  );

  if (plaintext === null) {
    throw new Error('Decryption failed: authentication tag mismatch or corrupt ciphertext');
  }

  return new TextDecoder().decode(plaintext);
}

/**
 * Encrypt a single onion layer payload for a service node.
 * Uses an ephemeral keypair so the node cannot link multiple packets to the same sender.
 */
export function encryptOnionLayer(payload: Uint8Array, nodePublicKey: Uint8Array): OnionLayer {
  const ephemeralKeypair = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const ciphertext = nacl.box(payload, nonce, nodePublicKey, ephemeralKeypair.secretKey);

  return {
    ciphertext,
    nonce,
    ephemeralPublicKey: ephemeralKeypair.publicKey,
  };
}

/**
 * Decrypt a single onion layer using the node's X25519 secret key.
 * Returns the inner payload to be forwarded.
 */
export function decryptOnionLayer(layer: OnionLayer, nodeSecretKey: Uint8Array): Uint8Array {
  const payload = nacl.box.open(
    layer.ciphertext,
    layer.nonce,
    layer.ephemeralPublicKey,
    nodeSecretKey
  );

  if (payload === null) {
    throw new Error('Onion layer decryption failed: invalid node secret key or corrupt packet');
  }

  return payload;
}

/**
 * Sign a message using secp256k1 (Cosmos-compatible).
 * Returns a 64-byte compact signature (r || s).
 */
export async function signMessage(message: Uint8Array, privKey: Uint8Array): Promise<Uint8Array> {
  const msgHash = sha256(message);
  const extSig = await Secp256k1.createSignature(msgHash, privKey);
  return extSig.toFixedLength();
}

/**
 * Verify a secp256k1 signature.
 * Returns true if the signature is valid for the given message and public key.
 */
export async function verifySignature(
  message: Uint8Array,
  signature: Uint8Array,
  pubKey: Uint8Array
): Promise<boolean> {
  try {
    const msgHash = sha256(message);
    const { Secp256k1Signature } = await import('@cosmjs/crypto');
    const sig = Secp256k1Signature.fromFixedLength(signature);
    return await Secp256k1.verifySignature(sig, msgHash, pubKey);
  } catch {
    return false;
  }
}

/**
 * Serialize EncryptedMessage to wire format (all binary as hex strings).
 */
export function serializeEncryptedMessage(msg: EncryptedMessage): EncryptedMessageWire {
  return {
    ciphertext: toHex(msg.ciphertext),
    nonce: toHex(msg.nonce),
    ephemeralPublicKey: toHex(msg.ephemeralPublicKey),
    senderAddress: msg.senderAddress,
    version: msg.version,
  };
}

/**
 * Deserialize EncryptedMessage from wire format.
 */
export function deserializeEncryptedMessage(wire: EncryptedMessageWire): EncryptedMessage {
  return {
    ciphertext: fromHex(wire.ciphertext),
    nonce: fromHex(wire.nonce),
    ephemeralPublicKey: fromHex(wire.ephemeralPublicKey),
    senderAddress: wire.senderAddress,
    version: wire.version,
  };
}
