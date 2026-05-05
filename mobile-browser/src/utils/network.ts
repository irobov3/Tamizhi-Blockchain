/**
 * Network helpers — retry with exponential backoff and a tiny
 * connectivity probe (we avoid `@react-native-community/netinfo`
 * to keep the native module surface unchanged).
 */

import { CONFIG } from '../config';
import { reportError, addBreadcrumb } from './telemetry';

export interface RetryOptions {
  /** Max number of attempts (including the first). Default 3. */
  maxAttempts?: number;
  /** Initial delay in ms. Default 500. */
  baseDelayMs?: number;
  /** Cap on a single delay. Default 5000. */
  maxDelayMs?: number;
  /** Optional label for breadcrumb logging. */
  label?: string;
  /** Predicate — return false to abort early on a given error. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

/** Retry an async operation with exponential backoff + jitter. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 5000,
    label = 'op',
    shouldRetry = () => true,
  } = opts;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !shouldRetry(err, attempt)) break;

      const exp = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = Math.random() * exp * 0.25;
      const delay = exp + jitter;

      addBreadcrumb({
        category: 'network',
        message: `retry ${label} attempt ${attempt}/${maxAttempts} in ${Math.round(delay)}ms`,
        level: 'warning',
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  reportError(lastErr, { label, maxAttempts });
  throw lastErr;
}

/**
 * Cheap connectivity probe — HEADs the storage server with a short timeout.
 * Returns true if reachable, false otherwise. Never throws.
 */
export async function probeConnectivity(timeoutMs = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${CONFIG.STORAGE_SERVER_URL}/health`, {
      method: 'GET',
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
