/**
 * URL helpers for the Tamizhi browser.
 */

export type SearchEngine = 'google' | 'duckduckgo' | 'brave';

const SEARCH_ENDPOINTS: Record<SearchEngine, string> = {
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  brave: 'https://search.brave.com/search?q=',
};

/**
 * Normalize raw user input from the URL bar.
 * - Already a URL? Return as-is (after http/https prefix).
 * - tamizhi:// or ipfs:// scheme? Pass through.
 * - Otherwise treat as a search query.
 */
export function normalizeURL(
  input: string,
  engine: SearchEngine = 'google'
): string {
  const raw = input.trim();
  if (!raw) return '';

  // Custom schemes
  if (/^(https?|ipfs|tamizhi|ipns|file|about):/i.test(raw)) {
    return raw;
  }

  // localhost / IP
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/.test(raw)) {
    return `http://${raw}`;
  }

  // Looks like a domain (contains a dot, no spaces)
  if (!/\s/.test(raw) && /\./.test(raw)) {
    return `https://${raw}`;
  }

  // Fall back to search
  return `${SEARCH_ENDPOINTS[engine]}${encodeURIComponent(raw)}`;
}

/**
 * Resolve `ipfs://CID/path` → `<gateway>/CID/path`.
 */
export function resolveIpfs(
  url: string,
  gateway = 'https://ipfs.io/ipfs/'
): string {
  const m = url.match(/^ipfs:\/\/(.+)$/i);
  if (!m) return url;
  const trimmedGw = gateway.endsWith('/') ? gateway : gateway + '/';
  return trimmedGw + m[1];
}

/**
 * Parse `tamizhi://wallet`, `tamizhi://settings` URLs to internal routes.
 * Returns null if it's not a tamizhi URL.
 */
export function parseTamizhiURL(
  url: string
): { route: string; params?: Record<string, string> } | null {
  const m = url.match(/^tamizhi:\/\/([^?]+)(\?(.+))?$/i);
  if (!m) return null;
  const route = m[1].replace(/\/+$/, '');
  const params: Record<string, string> = {};
  if (m[3]) {
    m[3].split('&').forEach((kv) => {
      const [k, v] = kv.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    });
  }
  return { route, params };
}

/**
 * Extract domain (host) for permission tracking. Falls back to scheme name
 * for non-http schemes (e.g. "ipfs" / "tamizhi").
 */
export function getDomain(url: string): string {
  try {
    const u = new URL(url);
    if (u.host) return u.host.toLowerCase();
    return u.protocol.replace(':', '');
  } catch {
    const m = url.match(/^([a-z][a-z0-9+\-.]*):\/\/([^/?#]+)/i);
    if (m) return m[2].toLowerCase();
    return url;
  }
}

export function getScheme(url: string): string {
  const m = url.match(/^([a-z][a-z0-9+\-.]*):/i);
  return m ? m[1].toLowerCase() : '';
}

export function isSecure(url: string): boolean {
  return /^https:/i.test(url);
}
