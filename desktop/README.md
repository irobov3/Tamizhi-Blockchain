# Tamizhi Desktop

Electron + React + TypeScript desktop application for the Tamizhi platform — Tamil digital sovereignty.

## Prerequisites

- Node.js 18+
- npm 9+
- macOS / Windows / Linux

## Quick Start

```bash
cd desktop

# Install dependencies
npm install

# Start in development mode (hot-reload)
npm run dev

# Build distributable
npm run package
```

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Electron Main Process                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │   src/main/index.ts  — BrowserWindow, app lifecycle │ │
│  │   src/main/ipc/*.ts  — IPC channel handlers         │ │
│  │   src/main/services/ — crypto / db / network        │ │
│  └─────────────────────────────────────────────────────┘ │
│                  IPC Bridge (preload.ts)                  │
│  window.tamizhi = { db, crypto, openExternal, … }        │
└──────────────────────────────────────────────────────────┘
         ↕ ipcRenderer.invoke / ipcMain.handle
┌──────────────────────────────────────────────────────────┐
│                 Renderer Process (React)                  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  src/renderer/src/                                  │ │
│  │    pages/     — WalletPage, MessengerPage, etc.     │ │
│  │    store/     — Zustand wallet.store, chat.store    │ │
│  │    hooks/     — useIPC.ts typed bridge              │ │
│  │    lib/       — api.ts (Axios + SSE)                │ │
│  │    components/— Button, Input, Modal, Badge, etc.   │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## IPC Channels Reference

| Channel | Direction | Description |
|---------|-----------|-------------|
| `window:minimize` | Renderer → Main | Minimize window |
| `window:maximize` | Renderer → Main | Toggle maximize, returns `boolean` |
| `window:close` | Renderer → Main | Close window |
| `db:getMessages` | Renderer → Main | Get messages for a conversation |
| `db:saveMessage` | Renderer → Main | Persist a message |
| `db:getConversations` | Renderer → Main | List all conversations |
| `db:upsertConversation` | Renderer → Main | Create/update conversation |
| `db:markConversationRead` | Renderer → Main | Zero unread count |
| `db:getWallet` | Renderer → Main | Load stored wallet |
| `db:saveWallet` | Renderer → Main | Persist wallet |
| `db:updateMessageStatus` | Renderer → Main | Update message status |
| `crypto:generateWallet` | Renderer → Main | Generate or restore wallet from mnemonic |
| `crypto:encryptMessage` | Renderer → Main | X25519 + XSalsa20-Poly1305 encrypt |
| `crypto:decryptMessage` | Renderer → Main | Decrypt message |
| `crypto:sign` | Renderer → Main | Sign data with Ed25519 |
| `crypto:deriveX25519` | Renderer → Main | Derive X25519 keypair from mnemonic |
| `shell:openExternal` | Renderer → Main | Open URL in system browser |
| `clipboard:write` | Renderer → Main | Write text to clipboard |
| `notification:show` | Renderer → Main | Show OS notification |
| `tray:new-message` | Main → Renderer | Incoming message event |
| `message:incoming` | Main → Renderer | New encrypted message received |
| `updater:update-available` | Main → Renderer | Auto-update available |

## Environment Variables

Create `desktop/.env` (copied from `.env.example`):

```env
VITE_API_URL=https://api.tamizhi.ai
VITE_LCD_URL=https://lcd.tamizhi.ai
VITE_RPC_URL=https://rpc.tamizhi.ai
VITE_WS_URL=wss://api.tamizhi.ai
VITE_CHAIN_ID=tamizhi-1
```

For local development:

```env
VITE_API_URL=http://localhost:3000
VITE_LCD_URL=http://localhost:1317
VITE_RPC_URL=http://localhost:26657
VITE_WS_URL=ws://localhost:3000
VITE_CHAIN_ID=tamizhi-local
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + W` | Close window |
| `Ctrl/⌘ + M` | Minimize |
| `Ctrl/⌘ + R` | Reload (dev) |
| `Ctrl/⌘ + Shift + I` | DevTools (dev) |
| `Ctrl/⌘ + ,` | Open Settings |
| `Ctrl/⌘ + N` | New message |
| `Ctrl/⌘ + K` | Search / command palette |
| `Escape` | Close modal / panel |

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/onboarding` | `OnboardingPage` | Wallet creation / import wizard |
| `/wallet` | `WalletPage` | Balance, send, receive, transactions |
| `/messenger` | `MessengerPage` | E2E encrypted messaging |
| `/literature` | `LiteraturePage` | Browse, search, upload Tamil works |
| `/explorer` | `ExplorerPage` | Chain explorer — blocks & transactions |
| `/ai` | `AIPage` | Tamizhi AI assistant with streaming |
| `/settings` | `SettingsPage` | Network, keyring, appearance |

## Build for Distribution

```bash
# macOS DMG
npm run package -- --mac

# Windows NSIS installer
npm run package -- --win

# Linux AppImage + deb
npm run package -- --linux
```

Output goes to `desktop/dist/`.

## Security Notes

- **Keys never leave the device** — mnemonic stored locally in SQLite (production: encrypt with OS keychain)
- **IPC bridge is context-isolated** — renderer has no access to Node.js or Electron internals
- **Preload uses contextBridge** — only explicitly exposed methods are callable from renderer
- **E2E encryption** — X25519 Diffie-Hellman + XSalsa20-Poly1305 (NaCl box)
