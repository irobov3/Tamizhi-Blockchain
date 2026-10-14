# Tamizhi Desktop Wallet

Native Win/Mac/Linux wallet for the Tamizhi chain, built on Tauri 2.

## Tech stack

- Tauri 2 (Rust shell + WebView frontend)
- React 18 + TypeScript + Vite
- TailwindCSS
- @cosmjs/stargate, @cosmjs/proto-signing (real signing — never mock)
- Zustand for state
- @tauri-apps/plugin-store for encrypted persistence
- qrcode.react for receive QR

## Develop

```bash
cd desktop-wallet
npm install
npm run tauri:dev    # opens native window with HMR
```

You can also run the web side standalone for fast iteration:

```bash
npm run dev          # http://localhost:1421
```

The wallet falls back to `localStorage` for the keystore when running outside
the Tauri shell, and to the Tauri plugin-store (per-OS app-data directory)
when running natively.

## Build installers

```bash
npm run tauri:build
```

Produces, per platform target:

| OS      | Artifact (under `src-tauri/target/release/bundle/`) |
|---------|------------------------------------------------------|
| macOS   | `macos/Tamizhi Wallet.app`, `dmg/Tamizhi Wallet.dmg` |
| Windows | `nsis/Tamizhi Wallet_*.exe`, `msi/Tamizhi Wallet_*.msi` |
| Linux   | `deb/*.deb`, `rpm/*.rpm`, `appimage/*.AppImage`      |

## Code signing

- **macOS**: requires an Apple Developer ID Application certificate. Set
  `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` env
  vars before `npm run tauri:build`. Tauri handles notarization via `notarytool`.
- **Windows**: requires an EV Code Signing Certificate (Authenticode). Set
  `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, or use
  `signtool` post-build for hardware-token EV certs.
- **Linux**: no OS-level signing; .deb/.rpm/AppImage are distributed as-is or
  via package repos.

## Multi-wallet & encryption

- Each wallet entry stores only the CosmJS-encrypted serialization
  (`serializeWithEncryptionKey`, AES-256 GCM) on disk — plaintext mnemonic is
  never persisted.
- The encryption key is derived per-wallet from the user's password via
  PBKDF2-SHA256 (600,000 iterations, app-scoped salt).
- Each wallet may use a different password.
- `Lock` button purges the in-memory signer; the next signing op re-prompts
  for the password.

## Native features

- System tray with `Open Wallet` / `Quit` and a balance line.
- Single-instance lock (a 2nd launch refocuses the existing window).
- Deep-link handler: `tamizhi://send?to=tamizhi1...&amount=10` opens with
  the Send form prefilled.
- Auto-update channel (`tauri-plugin-updater`) wired but inactive — set
  `plugins.updater.active = true` and provide a pubkey + endpoint to enable.

## Project layout

```
desktop-wallet/
├── src/                      # React app
│   ├── api/chain.ts          # Cosmos REST client
│   ├── wallet/keystore.ts    # Encrypted multi-wallet store
│   ├── wallet/client.ts      # SigningStargateClient wiring
│   ├── store/                # Zustand stores
│   ├── components/           # Sidebar, Header, BalanceCard, ...
│   ├── pages/                # Dashboard / Send / ... / Settings
│   └── App.tsx
├── src-tauri/                # Rust shell
│   ├── src/lib.rs            # tray, single-instance, deep-link
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── Cargo.toml
└── package.json
```

## Running against a local chain

The default network points to `localhost:1317` (REST) / `localhost:26657` (RPC)
with chain id `tamizhi-testnet-1`. Adjust under Settings → Network or
edit `src/store/network.ts`.
