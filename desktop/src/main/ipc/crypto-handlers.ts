import { ipcMain } from 'electron';
import {
  generateWallet,
  deriveX25519FromMnemonic,
  encryptMessage,
  decryptMessage,
  signWithSecp256k1,
} from '../services/crypto-service';
import type { EncryptArgs, DecryptArgs, SignArgs } from '../services/crypto-service';

export function registerCryptoHandlers(): void {
  // Generate a new wallet (or restore from mnemonic)
  ipcMain.handle('crypto:generateWallet', async (_event, mnemonic?: string) => {
    try {
      const result = await generateWallet(mnemonic);
      // Never expose x25519Secret to renderer after initial generation
      // Renderer should save the full result only once to secure storage
      return result;
    } catch (err) {
      console.error('[crypto:generateWallet]', err);
      throw new Error(
        err instanceof Error ? err.message : 'Wallet generation failed'
      );
    }
  });

  // Derive X25519 messaging keys from mnemonic
  ipcMain.handle('crypto:deriveX25519', async (_event, mnemonic: string) => {
    try {
      return await deriveX25519FromMnemonic(mnemonic);
    } catch (err) {
      console.error('[crypto:deriveX25519]', err);
      throw new Error(
        err instanceof Error ? err.message : 'Key derivation failed'
      );
    }
  });

  // Encrypt a message (NaCl box)
  ipcMain.handle('crypto:encryptMessage', (_event, args: EncryptArgs) => {
    try {
      if (
        !args ||
        typeof args.plaintext !== 'string' ||
        typeof args.recipientX25519Public !== 'string' ||
        typeof args.senderX25519Secret !== 'string'
      ) {
        throw new Error('Invalid encryption arguments');
      }
      return encryptMessage(args);
    } catch (err) {
      console.error('[crypto:encryptMessage]', err);
      throw new Error(
        err instanceof Error ? err.message : 'Encryption failed'
      );
    }
  });

  // Decrypt a message (NaCl box open)
  ipcMain.handle('crypto:decryptMessage', (_event, args: DecryptArgs) => {
    try {
      if (
        !args ||
        typeof args.ciphertext !== 'string' ||
        typeof args.nonce !== 'string' ||
        typeof args.ephemeralPubKey !== 'string' ||
        typeof args.recipientX25519Secret !== 'string'
      ) {
        throw new Error('Invalid decryption arguments');
      }
      return decryptMessage(args);
    } catch (err) {
      console.error('[crypto:decryptMessage]', err);
      throw new Error(
        err instanceof Error ? err.message : 'Decryption failed'
      );
    }
  });

  // Sign data with secp256k1 / Ed25519
  ipcMain.handle('crypto:sign', (_event, args: SignArgs) => {
    try {
      if (
        !args ||
        typeof args.data !== 'string' ||
        typeof args.privateKey !== 'string'
      ) {
        throw new Error('Invalid signing arguments');
      }
      return signWithSecp256k1(args.data, args.privateKey);
    } catch (err) {
      console.error('[crypto:sign]', err);
      throw new Error(err instanceof Error ? err.message : 'Signing failed');
    }
  });
}
