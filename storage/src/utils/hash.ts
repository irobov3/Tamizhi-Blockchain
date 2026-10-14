import crypto from 'crypto';
import { Readable } from 'stream';

/**
 * Compute SHA-256 hash of a Buffer synchronously.
 * Returns a lowercase hex string.
 */
export function computeSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compute SHA-256 hash of a Readable stream asynchronously.
 * Returns a Promise resolving to a lowercase hex string.
 */
export function computeSHA256Stream(readable: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');

    readable.on('data', (chunk: Buffer | string) => {
      hash.update(chunk);
    });

    readable.on('end', () => {
      resolve(hash.digest('hex'));
    });

    readable.on('error', (err: Error) => {
      reject(new Error(`Stream hashing failed: ${err.message}`));
    });
  });
}
