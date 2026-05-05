// Formatting helpers for the Tamizhi wallet.

const DECIMALS = 6;

/**
 * Convert a utmz integer string to a human-readable TMZ string with the
 * suffix appended. e.g. "1234567890" -> "1,234.567890 TMZ".
 */
export function formatTMZ(utmzString: string | number | bigint, withSuffix = true): string {
  let raw: bigint;
  try {
    raw = BigInt(utmzString as any);
  } catch {
    return withSuffix ? '0 TMZ' : '0';
  }
  const negative = raw < 0n;
  if (negative) raw = -raw;
  const factor = 10n ** BigInt(DECIMALS);
  const whole = raw / factor;
  const frac = raw % factor;
  const fracStr = frac.toString().padStart(DECIMALS, '0');
  const wholeFormatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = negative ? '-' : '';
  const num = `${sign}${wholeFormatted}.${fracStr}`;
  return withSuffix ? `${num} TMZ` : num;
}

/** Convert a human TMZ string ("1.5") to a utmz integer string ("1500000"). */
export function tmzToUtmz(tmz: string): string {
  if (!tmz) return '0';
  const cleaned = tmz.trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return '0';
  const [whole, fracRaw = ''] = cleaned.split('.');
  const frac = (fracRaw + '0'.repeat(DECIMALS)).slice(0, DECIMALS);
  const combined = (whole || '0') + frac;
  const stripped = combined.replace(/^0+/, '') || '0';
  return stripped;
}

/** Convert a utmz integer string to a TMZ decimal string (no suffix). */
export function utmzToTmz(utmz: string | number | bigint): string {
  return formatTMZ(utmz, false).replace(/,/g, '');
}

/** "tamizhi1abcdefgh...wxyz" — first 11 + last 4 chars by default. */
export function truncateAddress(addr: string | null | undefined, head = 11, tail = 4): string {
  if (!addr) return '';
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

/**
 * Format a unix timestamp (seconds OR ms) as a relative time string.
 * "just now", "2 minutes ago", "yesterday", "5 days ago", etc.
 */
export function formatRelativeTime(unix: number | string | Date): string {
  let t: number;
  if (unix instanceof Date) t = unix.getTime();
  else if (typeof unix === 'string') t = new Date(unix).getTime();
  else t = unix < 1e12 ? unix * 1000 : unix;

  if (!Number.isFinite(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return 'just now';
  if (sec < 60) return `${sec} seconds ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
