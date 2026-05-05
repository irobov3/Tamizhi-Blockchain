// URL parsing & scheme resolution for Tamizhi browser

export const DEFAULT_IPFS_GATEWAY = "https://ipfs.io/ipfs/";

export type SchemeKind =
  | "http"
  | "https"
  | "ipfs"
  | "tamizhi"
  | "about"
  | "search"
  | "unknown";

export interface ResolvedURL {
  kind: SchemeKind;
  // The URL to actually load in an iframe (or empty for native overlays).
  loadURL: string;
  // The "display" URL kept in the address bar.
  displayURL: string;
  // For tamizhi:// — what overlay to open.
  overlay?: "wallet" | "settings" | "bookmarks" | "history" | "home";
}

const SEARCH_ENGINE = "https://duckduckgo.com/?q=";

export function resolveURL(
  raw: string,
  ipfsGateway: string = DEFAULT_IPFS_GATEWAY,
): ResolvedURL {
  const input = raw.trim();
  if (!input) {
    return { kind: "about", loadURL: "", displayURL: "", overlay: "home" };
  }

  // tamizhi://...
  if (input.startsWith("tamizhi://")) {
    const path = input.slice("tamizhi://".length).split(/[/?#]/)[0];
    const overlay =
      path === "wallet" || path === "settings" || path === "bookmarks" ||
          path === "history" || path === "home"
        ? (path as ResolvedURL["overlay"])
        : "home";
    return {
      kind: "tamizhi",
      loadURL: "",
      displayURL: input,
      overlay,
    };
  }

  // ipfs://CID/path
  if (input.startsWith("ipfs://")) {
    const cidPath = input.slice("ipfs://".length);
    const gw = ipfsGateway.endsWith("/") ? ipfsGateway : ipfsGateway + "/";
    return {
      kind: "ipfs",
      loadURL: gw + cidPath,
      displayURL: input,
    };
  }

  // about:blank
  if (input === "about:blank" || input === "about:home") {
    return {
      kind: "about",
      loadURL: "",
      displayURL: input,
      overlay: "home",
    };
  }

  // http/https
  if (/^https?:\/\//i.test(input)) {
    return { kind: input.startsWith("https") ? "https" : "http", loadURL: input, displayURL: input };
  }

  // Looks like a domain (e.g. "tamizhi.ai", "localhost:3000")
  if (/^[a-z0-9.-]+(\.[a-z]{2,}|:\d+)(\/.*)?$/i.test(input)) {
    const u = "https://" + input;
    return { kind: "https", loadURL: u, displayURL: u };
  }

  // Otherwise, treat as a search query.
  const u = SEARCH_ENGINE + encodeURIComponent(input);
  return { kind: "search", loadURL: u, displayURL: u };
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function isSecure(url: string): boolean {
  return url.startsWith("https://") || url.startsWith("tamizhi://");
}
