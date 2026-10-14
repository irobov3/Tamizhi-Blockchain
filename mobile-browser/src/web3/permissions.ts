/**
 * Per-domain Web3 permission tracking, persisted to expo-secure-store.
 *
 * Schema:
 *   {
 *     [domain]: {
 *       enable: 'allowed' | 'denied',
 *       signAmino: 'prompt' | 'always-allow' | 'always-deny',
 *       signDirect: 'prompt' | 'always-allow' | 'always-deny',
 *       getAccounts: 'allowed' | 'denied',
 *     }
 *   }
 */
import * as SecureStore from 'expo-secure-store';

const KEY = 'tamizhi.browser.web3.permissions.v1';

export type ConnectChoice = 'allowed' | 'denied';
export type SignChoice = 'prompt' | 'always-allow' | 'always-deny';

export interface DomainPermissions {
  enable?: ConnectChoice;
  getAccounts?: ConnectChoice;
  signAmino?: SignChoice;
  signDirect?: SignChoice;
}

export type PermissionsMap = Record<string, DomainPermissions>;

let cache: PermissionsMap | null = null;

async function load(): Promise<PermissionsMap> {
  if (cache) return cache;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    cache = raw ? (JSON.parse(raw) as PermissionsMap) : {};
  } catch {
    cache = {};
  }
  return cache;
}

async function save(map: PermissionsMap): Promise<void> {
  cache = map;
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('permissions save failed', e);
  }
}

export async function getPermissions(
  domain: string
): Promise<DomainPermissions> {
  const map = await load();
  return map[domain] ?? {};
}

export async function setPermission(
  domain: string,
  patch: DomainPermissions
): Promise<void> {
  const map = await load();
  map[domain] = { ...(map[domain] ?? {}), ...patch };
  await save(map);
}

export async function clearPermissions(domain?: string): Promise<void> {
  if (!domain) {
    await save({});
    return;
  }
  const map = await load();
  delete map[domain];
  await save(map);
}

/**
 * Determine whether the request should proceed without prompting.
 * Returns:
 *   'allow'  → call through
 *   'deny'   → reject without prompting
 *   'prompt' → show modal
 */
export async function checkPermission(
  domain: string,
  method: string
): Promise<'allow' | 'deny' | 'prompt'> {
  const perms = await getPermissions(domain);
  switch (method) {
    case 'enable':
    case 'getAccounts': {
      const v = perms[method as 'enable' | 'getAccounts'];
      if (v === 'allowed') return 'allow';
      if (v === 'denied') return 'deny';
      return 'prompt';
    }
    case 'signAmino':
    case 'signDirect': {
      const v = perms[method as 'signAmino' | 'signDirect'];
      if (v === 'always-allow') return 'allow';
      if (v === 'always-deny') return 'deny';
      return 'prompt';
    }
    default:
      return 'prompt';
  }
}
