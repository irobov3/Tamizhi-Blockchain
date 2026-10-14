// Broker between iframe-injected `window.tamizhi` and the in-app wallet.
// Listens for postMessage `tamizhi-request` events, routes them through
// permission prompts, and posts back `tamizhi-response`.

import { useWallet } from "../store/wallet";
import { hostnameOf } from "../utils/url";
import { DEFAULT_CHAIN_ID } from "../api/chain";

export type ProviderRequest = {
  target: "tamizhi-request";
  id: string;
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
};

type PermissionDecision = "approve" | "deny";

// Per-origin permission grants (cleared on app close).
const grants = new Set<string>();

// Pending UI prompts keyed by id.
type Prompter = (origin: string, method: string, params: unknown) => Promise<PermissionDecision>;
let prompter: Prompter = async () => "deny";
export function setPermissionPrompter(p: Prompter) { prompter = p; }

function reply(
  source: MessageEventSource | null,
  id: string,
  payload: { result?: unknown; error?: string },
) {
  if (!source) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (source as any).postMessage({ target: "tamizhi-response", id, ...payload }, "*");
}

async function ensurePermission(origin: string, method: string, params: unknown): Promise<boolean> {
  if (grants.has(origin)) return true;
  // Read-only methods that don't require permission:
  if (method === "getChainId") return true;
  const decision = await prompter(origin, method, params);
  if (decision === "approve") {
    grants.add(origin);
    return true;
  }
  return false;
}

export async function handleProviderRequest(
  ev: MessageEvent,
  origin: string,
): Promise<void> {
  const data = ev.data as ProviderRequest;
  if (!data || data.target !== "tamizhi-request") return;
  const { id, method, params } = data;
  const wallet = useWallet.getState();

  try {
    if (!(await ensurePermission(origin, method, params))) {
      return reply(ev.source, id, { error: "User denied permission" });
    }

    switch (method) {
      case "getChainId":
        return reply(ev.source, id, { result: DEFAULT_CHAIN_ID });

      case "enable": {
        if (!wallet.unlocked) {
          return reply(ev.source, id, { error: "Wallet is locked" });
        }
        return reply(ev.source, id, { result: { chainId: DEFAULT_CHAIN_ID, address: wallet.address } });
      }

      case "getAccounts": {
        const w = wallet.getWallet();
        if (!w) return reply(ev.source, id, { error: "Wallet locked" });
        const accounts = await w.getAccounts();
        return reply(ev.source, id, {
          result: accounts.map((a) => ({
            address: a.address,
            algo: a.algo,
            pubkey: Array.from(a.pubkey),
          })),
        });
      }

      case "signAmino": {
        // Amino signing requires Secp256k1HdWallet, which is constructed
        // on demand from the same mnemonic. We don't expose plaintext here;
        // this MVP returns an error and asks dApps to use signDirect.
        return reply(ev.source, id, { error: "signAmino not yet implemented in MVP — use signDirect" });
      }

      case "signDirect": {
        const w = wallet.getWallet();
        if (!w) return reply(ev.source, id, { error: "Wallet locked" });
        const { signer, signDoc } = params ?? {};
        const signed = await w.signDirect(signer, signDoc);
        return reply(ev.source, id, { result: signed });
      }

      default:
        return reply(ev.source, id, { error: "Method not supported: " + method });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return reply(ev.source, id, { error: msg });
  }
}

export function installProviderListener() {
  window.addEventListener("message", (ev) => {
    const data = ev.data as ProviderRequest | undefined;
    if (!data || data.target !== "tamizhi-request") return;
    // Resolve origin: ev.origin is "null" for sandboxed iframes,
    // fall back to active tab's host.
    const origin = ev.origin && ev.origin !== "null" ? ev.origin : "iframe-tab";
    void handleProviderRequest(ev, hostnameOf(origin) || origin);
  });
}
