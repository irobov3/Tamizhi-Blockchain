/**
 * Polyfills for React Native / Expo (Hermes engine)
 * Must be imported as the very first line of _layout.tsx
 */

// Buffer polyfill (needed for hex/base64 conversions used by tweetnacl, bip39, etc.)
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

// crypto.getRandomValues polyfill for bip39 and other crypto libs
// expo-crypto provides a native implementation
import * as ExpoCrypto from 'expo-crypto';

if (typeof global.crypto === 'undefined') {
  // @ts-ignore
  global.crypto = {};
}

if (typeof global.crypto.getRandomValues === 'undefined') {
  // @ts-ignore
  global.crypto.getRandomValues = (array: Uint8Array) => {
    const bytes = ExpoCrypto.getRandomBytes(array.length);
    array.set(bytes);
    return array;
  };
}
