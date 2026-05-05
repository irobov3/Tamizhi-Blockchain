import nacl from 'tweetnacl';
import { fromHex, toHex, toBech32, fromBech32 } from '@cosmjs/encoding';
import { Secp256k1, sha256, ripemd160, Bip39, EnglishMnemonic, Slip10, Slip10Curve, Slip10RawIndex } from '@cosmjs/crypto';

// m/44'/118'/0'/0/0 — standard Cosmos HD path
function makeCosmoshubPath(account: number): readonly Slip10RawIndex[] {
  return [
    Slip10RawIndex.hardened(44),
    Slip10RawIndex.hardened(118),
    Slip10RawIndex.hardened(0),
    Slip10RawIndex.normal(0),
    Slip10RawIndex.normal(account),
  ];
}

export interface TamizhiIdentity {
  walletAddress: string;       // tamizhi1...
  secp256k1PublicKey: Uint8Array;  // 33 bytes compressed
  secp256k1PrivateKey: Uint8Array; // 32 bytes, NEVER expose
  x25519PublicKey: Uint8Array;     // 32 bytes, derived for encryption
  x25519SecretKey: Uint8Array;     // 32 bytes, NEVER expose
}

export interface PublicIdentity {
  walletAddress: string;
  x25519PublicKey: string; // hex
  secp256k1PublicKey: string; // hex
}

/**
 * Clamp a scalar for X25519 use per RFC 7748.
 * Bits 0, 1, 2 of first byte cleared; bit 7 of last byte cleared; bit 6 of last byte set.
 */
function clampScalar(scalar: Uint8Array): Uint8Array {
  const clamped = new Uint8Array(scalar);
  clamped[0] &= 248;
  clamped[31] &= 127;
  clamped[31] |= 64;
  return clamped;
}

/**
 * Derive a stable X25519 keypair from a secp256k1 private key.
 * Method: SHA-256 of (secp256k1_privkey || "tamizhi-x25519") → clamp → X25519 scalar multiply with base point
 */
export function deriveX25519FromSecp256k1(secp256k1PrivKey: Uint8Array): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} {
  // Domain-separated hash: secp256k1 privkey + protocol tag
  const tag = new TextEncoder().encode('tamizhi-x25519');
  const material = new Uint8Array(secp256k1PrivKey.length + tag.length);
  material.set(secp256k1PrivKey, 0);
  material.set(tag, secp256k1PrivKey.length);

  const hashed = sha256(material);
  const secretKey = clampScalar(hashed);

  // nacl.scalarMult.base computes secretKey * basePoint to get X25519 public key
  const publicKey = nacl.scalarMult.base(secretKey);

  return { publicKey, secretKey };
}

/**
 * Derive a Tamizhi wallet address (bech32 "tamizhi1...") from a compressed secp256k1 public key.
 * Method: SHA-256 → RIPEMD-160 of compressed public key → bech32 encode with "tamizhi" prefix
 */
function pubKeyToAddress(compressedPubKey: Uint8Array): string {
  const sha256Hash = sha256(compressedPubKey);
  const ripemd160Hash = ripemd160(sha256Hash);
  return toBech32('tamizhi', ripemd160Hash);
}

/**
 * Create a TamizhiIdentity from a BIP39 mnemonic using standard Cosmos HD derivation path m/44'/118'/0'/0/0.
 */
export async function identityFromMnemonic(mnemonic: string): Promise<TamizhiIdentity> {
  const englishMnemonic = new EnglishMnemonic(mnemonic);
  const seed = await Bip39.mnemonicToSeed(englishMnemonic);

  // Cosmos HD path: m/44'/118'/0'/0/0
  const hdPath = makeCosmoshubPath(0);
  const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, hdPath);

  const keypair = await Secp256k1.makeKeypair(privkey);
  const compressedPubKey = Secp256k1.compressPubkey(keypair.pubkey);
  const walletAddress = pubKeyToAddress(compressedPubKey);

  const x25519Keys = deriveX25519FromSecp256k1(privkey);

  return {
    walletAddress,
    secp256k1PublicKey: compressedPubKey,
    secp256k1PrivateKey: privkey,
    x25519PublicKey: x25519Keys.publicKey,
    x25519SecretKey: x25519Keys.secretKey,
  };
}

/**
 * Derive a TamizhiIdentity from a raw secp256k1 private key.
 * If walletAddress is empty string, it will be derived automatically.
 */
export async function identityFromPrivateKey(
  privKey: Uint8Array,
  walletAddress?: string
): Promise<TamizhiIdentity> {
  const keypair = await Secp256k1.makeKeypair(privKey);
  const compressedPubKey = Secp256k1.compressPubkey(keypair.pubkey);
  const address = walletAddress && walletAddress.length > 0
    ? walletAddress
    : pubKeyToAddress(compressedPubKey);

  const x25519Keys = deriveX25519FromSecp256k1(privKey);

  return {
    walletAddress: address,
    secp256k1PublicKey: compressedPubKey,
    secp256k1PrivateKey: privKey,
    x25519PublicKey: x25519Keys.publicKey,
    x25519SecretKey: x25519Keys.secretKey,
  };
}

/**
 * Export only the public parts of an identity — safe to share with peers and publish to the key registry.
 */
export function exportPublicIdentity(identity: TamizhiIdentity): PublicIdentity {
  return {
    walletAddress: identity.walletAddress,
    x25519PublicKey: toHex(identity.x25519PublicKey),
    secp256k1PublicKey: toHex(identity.secp256k1PublicKey),
  };
}

/**
 * Validate a bech32 Tamizhi wallet address.
 */
export function isValidAddress(address: string): boolean {
  try {
    const { prefix, data } = fromBech32(address);
    return prefix === 'tamizhi' && data.length === 20;
  } catch {
    return false;
  }
}
