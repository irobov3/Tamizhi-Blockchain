import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { Bip39, EnglishMnemonic, Slip10, Slip10Curve, stringToPath } from '@cosmjs/crypto';
import { toHex, fromHex, fromBase64, toBase64 } from '@cosmjs/encoding';
import nacl from 'tweetnacl';
import { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';
import type { WalletInfo, EncryptedMessage } from '../../shared/types';

const TAMIZHI_HD_PATH = "m/44'/118'/0'/0/0";
const TAMIZHI_PREFIX = 'tamizhi';

export interface GenerateWalletResult {
  mnemonic: string;
  address: string;
  publicKey: string;
  x25519Public: string;
  x25519Secret: string;
}

export interface EncryptArgs {
  plaintext: string;
  recipientX25519Public: string;
  senderX25519Secret: string;
}

export interface DecryptArgs {
  ciphertext: string;
  nonce: string;
  ephemeralPubKey: string;
  recipientX25519Secret: string;
}

export interface SignArgs {
  data: string; // hex-encoded
  privateKey: string; // hex-encoded secp256k1 private key
}

export async function generateWallet(
  existingMnemonic?: string
): Promise<GenerateWalletResult> {
  const wallet = existingMnemonic
    ? await DirectSecp256k1HdWallet.fromMnemonic(existingMnemonic, {
        prefix: TAMIZHI_PREFIX,
      })
    : await DirectSecp256k1HdWallet.generate(24, { prefix: TAMIZHI_PREFIX });

  const mnemonic = existingMnemonic ?? wallet.mnemonic;
  const [account] = await wallet.getAccounts();

  // Derive X25519 key pair from mnemonic for messaging
  const { x25519Public, x25519Secret } = await deriveX25519FromMnemonic(mnemonic);

  return {
    mnemonic,
    address: account.address,
    publicKey: toHex(account.pubkey),
    x25519Public,
    x25519Secret,
  };
}

export async function deriveX25519FromMnemonic(
  mnemonic: string
): Promise<{ x25519Public: string; x25519Secret: string }> {
  const mnemonicChecked = new EnglishMnemonic(mnemonic);
  const seed = await Bip39.mnemonicToSeed(mnemonicChecked);

  // Use a messaging-specific derivation path
  const messagingPath = stringToPath("m/44'/118'/0'/1/0");
  const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, messagingPath);

  // Convert secp256k1 private key to X25519 key pair via hashing
  const hash = nacl.hash(privkey);
  const x25519Seed = hash.slice(0, 32);

  const keyPair = nacl.box.keyPair.fromSecretKey(x25519Seed);

  return {
    x25519Public: encodeBase64(keyPair.publicKey),
    x25519Secret: encodeBase64(keyPair.secretKey),
  };
}

export function encryptMessage(args: EncryptArgs): EncryptedMessage {
  const { plaintext, recipientX25519Public, senderX25519Secret } = args;

  const recipientPubKey = decodeBase64(recipientX25519Public);
  const senderSecKey = decodeBase64(senderX25519Secret);

  // Generate ephemeral key pair for this message
  const ephemeralKeyPair = nacl.box.keyPair();

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const plaintextBytes = decodeUTF8(plaintext);

  const ciphertextBytes = nacl.box(
    plaintextBytes,
    nonce,
    recipientPubKey,
    senderSecKey
  );

  if (!ciphertextBytes) {
    throw new Error('Encryption failed');
  }

  return {
    ciphertext: encodeBase64(ciphertextBytes),
    nonce: encodeBase64(nonce),
    ephemeralPubKey: encodeBase64(ephemeralKeyPair.publicKey),
  };
}

export function decryptMessage(args: DecryptArgs): string {
  const { ciphertext, nonce, ephemeralPubKey, recipientX25519Secret } = args;

  const ciphertextBytes = decodeBase64(ciphertext);
  const nonceBytes = decodeBase64(nonce);
  const ephemeralPubKeyBytes = decodeBase64(ephemeralPubKey);
  const recipientSecKey = decodeBase64(recipientX25519Secret);

  const plaintextBytes = nacl.box.open(
    ciphertextBytes,
    nonceBytes,
    ephemeralPubKeyBytes,
    recipientSecKey
  );

  if (!plaintextBytes) {
    throw new Error('Decryption failed: invalid ciphertext or keys');
  }

  return encodeUTF8(plaintextBytes);
}

export function signWithSecp256k1(
  data: string,
  privKey: string
): string {
  // Use nacl signing as a fallback (Ed25519-based)
  const dataBytes = fromHex(data);
  const keyBytes = fromHex(privKey);

  const signingKeyPair = nacl.sign.keyPair.fromSeed(keyBytes.slice(0, 32));
  const signature = nacl.sign.detached(dataBytes, signingKeyPair.secretKey);

  return toHex(signature);
}

export function verifySignature(
  data: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const dataBytes = fromHex(data);
    const sigBytes = fromHex(signature);
    const pubKeyBytes = fromHex(publicKey);
    return nacl.sign.detached.verify(dataBytes, sigBytes, pubKeyBytes);
  } catch {
    return false;
  }
}
