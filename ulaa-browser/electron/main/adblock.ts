/**
 * Ulaa Browser — Built-in Ad & Tracker Blocker
 * Pattern-based filter engine (EasyList / EasyPrivacy compatible subset)
 */

import { Session } from 'electron';

// ── Common ad/tracker domains ────────────────────────────────────────────────
const BLOCKED_DOMAINS = new Set([
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adnxs.com', 'ads.yahoo.com', 'advertising.com', 'adsystem.com',
  'outbrain.com', 'taboola.com', 'revcontent.com', 'mgid.com',
  'criteo.com', 'criteo.net', 'adsrvr.org', 'rubiconproject.com',
  'openx.net', 'pubmatic.com', 'casalemedia.com', 'contextweb.com',
  'serving-sys.com', 'scorecardresearch.com', 'quantserve.com',
  'comscore.com', 'omtrdc.net', 'demdex.net', 'turn.com',
  'amazon-adsystem.com', 'media.net', 'adtech.de',
  'googletagmanager.com', 'googletagservices.com',
  'facebook.com/tr/', 'connect.facebook.net/en_US/fbevents',
  'analytics.twitter.com', 'ads.linkedin.com', 'ads.twitter.com',
  'hotjar.com', 'mouseflow.com', 'fullstory.com', 'logrocket.com',
  'mixpanel.com', 'segment.com', 'amplitude.com',
  'bat.bing.com', 'ads.msn.com', 'adservice.google.com',
  'pagead2.googlesyndication.com', 'tpc.googlesyndication.com',
  'sb.scorecardresearch.com', 'pixel.quantserve.com',
  'stats.g.doubleclick.net', 'ad.doubleclick.net',
  'securepubads.g.doubleclick.net', 'adblade.com', 'adroll.com',
  'zedo.com', 'yieldmanager.com', 'yieldmanager.net',
  'spotxchange.com', 'spotx.tv', 'smartadserver.com',
  'sharethrough.com', 'rhythmone.com', 'undertone.com',
]);

// ── URL pattern fragments to block ───────────────────────────────────────────
const BLOCKED_PATTERNS = [
  '/ads/', '/ad/', '/advert/', '/advertisement/',
  '/analytics/', '/tracking/', '/tracker/', '/pixel/',
  '/beacon/', '/telemetry/', '/metrics/',
  '/sponsored/', '/promo/', '/popup/',
  'ads.js', 'ad.js', 'adsbygoogle', 'adsense',
  '/pagead/', '/adframe/', '/adserver/',
];

let totalBlocked = 0;
const blockedByTab = new Map<number, number>();

function isBlocked(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Domain check
    for (const domain of BLOCKED_DOMAINS) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return true;
      }
    }

    // Pattern check
    const fullUrl = url.toLowerCase();
    for (const pattern of BLOCKED_PATTERNS) {
      if (fullUrl.includes(pattern)) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export const adBlocker = {
  setup(sess: Session, onBlocked?: (tabId: number) => void) {
    sess.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => {
        if (isBlocked(details.url)) {
          totalBlocked++;
          const tabId = details.webContentsId ?? 0;
          blockedByTab.set(tabId, (blockedByTab.get(tabId) ?? 0) + 1);
          onBlocked?.(tabId);
          callback({ cancel: true });
        } else {
          callback({});
        }
      },
    );
  },

  getTotalBlocked: () => totalBlocked,
  getTabBlocked: (tabId: number) => blockedByTab.get(tabId) ?? 0,
  resetTabBlocked: (tabId: number) => blockedByTab.delete(tabId),
};
