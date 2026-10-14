import { fromBech32 } from '@cosmjs/encoding';

/**
 * Validate a Tamizhi bech32 wallet address (prefix "tamizhi", 20-byte data).
 */
export function isValidTamizhiAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  try {
    const { prefix, data } = fromBech32(address);
    return prefix === 'tamizhi' && data.length === 20;
  } catch {
    return false;
  }
}

/**
 * Shorten an address for display purposes.
 * Default: show first 6 and last 4 characters separated by "..."
 *
 * Example: "tamizhi1abc...xyz"
 *
 * @param address - Full wallet address
 * @param chars   - Number of characters to show at the start (default 10 includes prefix)
 */
export function truncateAddress(address: string, chars: number = 10): string {
  if (!address || address.length <= chars + 4) return address;
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

/**
 * Produce a deterministic, canonical conversation ID from two wallet addresses.
 * The addresses are sorted lexicographically so the result is the same regardless
 * of which party calls the function.
 */
export function addressToConversationId(addr1: string, addr2: string): string {
  return [addr1, addr2].sort().join(':');
}

/**
 * Format a unix millisecond timestamp as a human-readable string.
 * - Today: "HH:MM"
 * - This year: "MMM D, HH:MM"
 * - Older: "MMM D YYYY"
 */
export function formatMessageTimestamp(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

  if (timestamp >= todayStart) {
    // Today — show time only
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  if (timestamp >= yearStart) {
    // This year — show date + time
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ', ' +
      date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Older — show full date
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Return the "peer" address in a conversation from the perspective of `myAddress`.
 * Given a conversationId of the form "addr1:addr2", returns the address that is NOT myAddress.
 */
export function peerAddressFromConversationId(
  conversationId: string,
  myAddress: string
): string {
  const parts = conversationId.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid conversationId format: ${conversationId}`);
  }
  const [a, b] = parts;
  if (a === myAddress) return b;
  if (b === myAddress) return a;
  throw new Error(`myAddress ${myAddress} not found in conversationId ${conversationId}`);
}

/**
 * Extract the numeric part of a Tamizhi address for hashing or indexing.
 * Decodes the bech32 data bytes and returns them as a hex string.
 */
export function addressToHex(address: string): string {
  const { data } = fromBech32(address);
  return Buffer.from(data).toString('hex');
}

/**
 * Compare two addresses for equality, case-insensitively.
 * Tamizhi addresses are lowercase bech32, but this guards against accidental mixed-case.
 */
export function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
