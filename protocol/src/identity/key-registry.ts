import axios from 'axios';
import { toHex } from '@cosmjs/encoding';
import type { TamizhiIdentity, PublicIdentity } from './keypair';
import { exportPublicIdentity } from './keypair';
import { signMessage } from '../crypto/encryption';

/**
 * In-memory cache of looked-up public identities.
 * Keyed by wallet address.
 */
const localCache = new Map<string, { identity: PublicIdentity; cachedAt: number }>();

/** Cache TTL: 10 minutes. Re-fetch after this to catch key rotations. */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Register a user's public identity with the Tamizhi backend key registry.
 * The registration request is signed with the user's secp256k1 private key so the server
 * can authenticate ownership of the wallet address.
 *
 * POST /api/v1/keys/register
 * Body: { walletAddress, x25519PublicKey, secp256k1PublicKey, signature, timestamp }
 */
export async function registerPublicKey(
  identity: TamizhiIdentity,
  backendUrl: string,
  authToken: string
): Promise<void> {
  const publicId = exportPublicIdentity(identity);
  const timestamp = Date.now();

  // Sign the canonical registration message to prove ownership of the secp256k1 key
  const registrationMessage = new TextEncoder().encode(
    `tamizhi-register:${publicId.walletAddress}:${publicId.x25519PublicKey}:${timestamp}`
  );
  const signature = await signMessage(registrationMessage, identity.secp256k1PrivateKey);

  await axios.post(
    `${backendUrl.replace(/\/$/, '')}/api/v1/keys/register`,
    {
      walletAddress: publicId.walletAddress,
      x25519PublicKey: publicId.x25519PublicKey,
      secp256k1PublicKey: publicId.secp256k1PublicKey,
      signature: toHex(signature),
      timestamp,
    },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    }
  );

  // Cache our own identity locally after successful registration
  cachePublicKey(publicId.walletAddress, publicId);
}

/**
 * Look up the public identity of a wallet address from the Tamizhi backend key registry.
 * Returns null if the address has not registered a public key.
 *
 * GET /api/v1/keys/:address
 */
export async function lookupPublicKey(
  walletAddress: string,
  backendUrl: string
): Promise<PublicIdentity | null> {
  // Return from cache if fresh
  const cached = getCachedPublicKey(walletAddress);
  if (cached) return cached;

  try {
    const response = await axios.get<PublicIdentity>(
      `${backendUrl.replace(/\/$/, '')}/api/v1/keys/${walletAddress}`,
      { timeout: 10_000 }
    );

    const identity = response.data;

    // Validate the returned data has the expected shape
    if (!identity.walletAddress || !identity.x25519PublicKey || !identity.secp256k1PublicKey) {
      return null;
    }

    // Cache the result
    cachePublicKey(walletAddress, identity);
    return identity;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Look up multiple public keys in a single batch request.
 * Returns a map of walletAddress → PublicIdentity (entries not found are omitted).
 *
 * POST /api/v1/keys/batch
 * Body: { addresses: string[] }
 */
export async function lookupPublicKeysBatch(
  addresses: string[],
  backendUrl: string
): Promise<Map<string, PublicIdentity>> {
  const result = new Map<string, PublicIdentity>();

  // Resolve cache hits first
  const uncached: string[] = [];
  for (const addr of addresses) {
    const cached = getCachedPublicKey(addr);
    if (cached) {
      result.set(addr, cached);
    } else {
      uncached.push(addr);
    }
  }

  if (uncached.length === 0) return result;

  const response = await axios.post<{ keys: PublicIdentity[] }>(
    `${backendUrl.replace(/\/$/, '')}/api/v1/keys/batch`,
    { addresses: uncached },
    { timeout: 15_000 }
  );

  for (const identity of response.data.keys ?? []) {
    cachePublicKey(identity.walletAddress, identity);
    result.set(identity.walletAddress, identity);
  }

  return result;
}

/**
 * Store a public identity in the local in-process cache.
 */
export function cachePublicKey(address: string, identity: PublicIdentity): void {
  localCache.set(address, { identity, cachedAt: Date.now() });
}

/**
 * Retrieve a cached public identity. Returns null if not cached or cache is stale.
 */
export function getCachedPublicKey(address: string): PublicIdentity | null {
  const entry = localCache.get(address);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    localCache.delete(address);
    return null;
  }
  return entry.identity;
}

/**
 * Evict a specific address from the local cache (e.g., after detecting a key mismatch).
 */
export function evictCachedPublicKey(address: string): void {
  localCache.delete(address);
}

/**
 * Clear the entire local key cache.
 */
export function clearKeyCache(): void {
  localCache.clear();
}

/**
 * Return the number of entries currently in the cache.
 */
export function keyCacheSize(): number {
  return localCache.size;
}
