# Tamizhi Browser (Desktop)

A Web3-aware desktop browser tied to the Tamizhi blockchain. Every page can request access to a built-in wallet via a `window.tamizhi` provider, similar in spirit to Brave / MetaMask but native to Tamizhi.

> **MVP limitation — read this first.** This first cut renders web pages inside `<iframe>` elements. That works for many sites, but the modern web is hostile to iframes: any site sending `X-Frame-Options: DENY|SAMEORIGIN` or a `frame-ancestors` CSP will refuse to load. **Google, YouTube, Twitter/X, GitHub, Facebook, Instagram, LinkedIn, Reddit, most banks, and most major SaaS apps will not render.** Sites that *do* work include most blogs, docs sites, IPFS-hosted dApps, and anything served by an origin you control. A future enhancement will swap the iframe layer for Tauri 2's native multi-webview API, which uses the OS WebView directly and is not subject to `X-Frame-Options`.

## Tech stack

- **Shell:** Tauri 2 (Rust) — `src-tauri/`
- **UI:** React 18 + TypeScript + Vite + TailwindCSS
- **State:** Zustand
- **Wallet:** `@cosmjs/proto-signing`, `@cosmjs/stargate`
- **Persistence:** `@tauri-apps/plugin-store` (with localStorage fallback in browser-only dev)
- **Encryption:** WebCrypto AES-GCM keystore, key derived via PBKDF2-SHA256 (250 000 iterations) from the user's password

## Layout

```
desktop-browser/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── public/
├── scripts/run-build.mjs
├── src/
│   ├── App.tsx                 — Top-level chrome
│   ├── main.tsx
│   ├── index.css
│   ├── api/chain.ts            — CosmJS connect helpers
│   ├── components/
│   │   ├── TabBar.tsx
│   │   ├── NavToolbar.tsx
│   │   ├── URLBar.tsx          — Address bar with autocomplete + bookmark star
│   │   ├── WebViewArea.tsx     — Iframe sandbox per active tab
│   │   ├── HomePage.tsx        — Speed-dial style start page
│   │   ├── BookmarksManager.tsx
│   │   ├── HistoryPanel.tsx
│   │   ├── Settings.tsx
│   │   ├── WalletPanel.tsx     — Create/import/unlock the in-app wallet
│   │   └── Web3PermissionModal.tsx
│   ├── store/
│   │   ├── tabs.ts             — Tab list + history per tab
│   │   ├── bookmarks.ts        — Persisted
│   │   ├── history.ts          — Persisted, capped at 10k
│   │   ├── wallet.ts           — Encrypted keystore
│   │   └── persist.ts          — Tauri Store plugin / localStorage shim
│   ├── utils/url.ts            — URL parsing, ipfs:// + tamizhi:// resolution
│   └── web3/
│       ├── inject.ts           — JS source for the injected `window.tamizhi`
│       └── provider.ts         — postMessage broker, calls into wallet
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/main-capability.json
    ├── icons/
    └── src/
        ├── main.rs
        └── lib.rs              — Tray, single-instance lock, deep links
```

## Development

```bash
cd desktop-browser
npm install
npm run tauri dev    # spins up vite dev + tauri shell
```

Pure-frontend dev (no Tauri shell) works too: `npm run dev` → http://localhost:1423. Persistence falls back to localStorage in that mode.

## Build

```bash
npm run tauri build
```

This produces native installers (`.app` / `.dmg`, `.msi` / `.exe`, `.deb` / `.rpm` / `.AppImage`) under `src-tauri/target/release/bundle/`.

## URL schemes

| Scheme | Behaviour |
|---|---|
| `https://`, `http://` | Loaded in iframe (subject to `X-Frame-Options`) |
| `ipfs://CID/path` | Resolved through configurable IPFS gateway (default `https://ipfs.io/ipfs/`) |
| `tamizhi://wallet` | Opens built-in wallet panel |
| `tamizhi://bookmarks` | Opens bookmarks manager |
| `tamizhi://history` | Opens history panel |
| `tamizhi://settings` | Opens settings panel |
| `tamizhi://home` | Opens speed-dial home |

The Tauri shell additionally registers `tamizhi-browser://` and `tamizhi://` as system deep-link schemes (see `tauri.conf.json` → `plugins.deep-link`), so other apps can open URLs in the browser via `open tamizhi-browser://open?url=...`.

## Web3 provider — `window.tamizhi`

The injected script (`src/web3/inject.ts`) exposes the following on every page:

```ts
interface TamizhiProvider {
  isTamizhiBrowser: true;
  chainId: "tamizhi-1";
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  enable(): Promise<{ chainId: string; address: string }>;
  getAccounts(): Promise<{ address: string; algo: string; pubkey: number[] }[]>;
  signDirect(signer: string, signDoc: SignDoc): Promise<DirectSignResponse>;
  signAmino(signer: string, signDoc: StdSignDoc): Promise<AminoSignResponse>; // MVP: not yet implemented
  sendTx(tx: Uint8Array): Promise<unknown>; // routed through wallet broker
  getChainId(): Promise<string>;
}
```

A `tamizhi#initialized` event fires on `window` once the provider is ready.

### Permission model

- The first non-`getChainId` call from a given origin triggers a `Web3PermissionModal` with **Approve / Deny** buttons.
- Approval is granted per-origin, in-memory only (cleared when the app closes).
- Signing operations always happen in the in-app process; the page never sees the mnemonic or private key.
- The wallet must be **unlocked** for `enable`, `getAccounts`, `signDirect`, `signAmino`, `sendTx` to succeed; otherwise the call is rejected with `"Wallet locked"`.

### Cross-origin caveat

Because pages are iframed, cross-origin pages cannot have the JS in `src/web3/inject.ts` programmatically injected from the parent (browser sandbox blocks it). dApps that want to interact with the Tamizhi browser today must either:

1. Implement the `postMessage` handshake themselves (target origin `'*'`, payload `{ target: "tamizhi-request", id, method, params }`), **or**
2. Be served from an origin where we can inject — same-origin to the React shell, or our own gateway.

The native multi-webview migration eliminates this — the script will run as a real userscript inside the page.

## Native (Rust) features

- Single-instance lock — second launches focus the existing window.
- System tray with `Open Browser`, `New Window`, `Quit`.
- Deep-link plugin registers `tamizhi-browser://` and `tamizhi://` URL schemes at the OS level.
- Plugins: `store`, `shell`, `dialog`, `deep-link`.

## Working vs MVP-stubbed

| Feature | Status |
|---|---|
| Multiple tabs (open/close/switch/drag-reorder) | Working |
| Address bar (autocomplete from bookmarks + history) | Working |
| Back / Forward / Reload / Home | Working |
| Bookmarks (add via star, manage panel, persisted) | Working |
| History (capped 10k, search, clear) | Working |
| Settings (search engine, IPFS gateway, clear data) | Working |
| Speed-dial home page | Working |
| `tamizhi://` overlays (wallet/bookmarks/history/settings) | Working |
| `ipfs://` rendering via configurable gateway | Working |
| Encrypted wallet (create / import / unlock / lock) | Working — AES-GCM + PBKDF2 |
| `window.tamizhi` JS source bundled | Working |
| `window.tamizhi` postMessage broker | Working |
| `getChainId`, `enable`, `getAccounts`, `signDirect` | Working |
| `signAmino` | MVP-stubbed — returns "not yet implemented", needs `Secp256k1HdWallet` path |
| `sendTx` | MVP-stubbed — broker plumbing in place, no chain-broadcast call yet |
| Web3 permission modal with per-origin grants | Working |
| Tauri tray + single-instance + deep links | Working |
| Native multi-webview tabs (instead of iframes) | Future enhancement |

## Sites known not to load (X-Frame-Options / CSP frame-ancestors)

Honest list — everything below blocks framing, so they will appear blank or show a refused-to-connect message until we move off iframes:

- google.com (search, gmail, drive, docs, youtube)
- twitter.com / x.com
- github.com
- facebook.com / instagram.com / threads.net
- linkedin.com
- reddit.com
- amazon.com
- most banking and brokerage sites
- most major SaaS dashboards (Stripe, Notion, Slack, Discord web, Atlassian, etc.)

Sites that typically work in iframes (i.e. the MVP is useful for):

- most blogs, docs, marketing sites, Wikipedia
- IPFS-hosted dApps via the configured gateway
- Substack, Medium (some posts), Hashnode, dev.to (article views)
- in-house dashboards / dApps you control

## Roadmap

1. Replace iframe layer with Tauri 2 multi-webview windows (eliminates X-Frame-Options entirely; gives real per-tab cookies, navigation events, console).
2. Real `signAmino` via `Secp256k1HdWallet`, plus on-demand keystore unlock for one-shot signing.
3. `sendTx` wired to a `SigningStargateClient` against the configured RPC.
4. Per-site permission persistence (with revoke UI).
5. Extension-style content blocking (Brave-parity ad/tracker filter).
6. WalletConnect bridge for non-Tamizhi-aware dApps.
