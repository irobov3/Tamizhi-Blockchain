# Tamizhi Messenger — Desktop

Native desktop client for the Tamizhi messenger network. Built with **Tauri 2** so the
release binary is ~10 MB instead of the ~200 MB an Electron equivalent would weigh.

## Tech stack

- **Tauri 2** — Rust window/runtime, system tray, native notifications
- **React 18 + TypeScript** — UI
- **Vite 5** — bundler / dev server
- **Zustand** — UI state
- **CosmJS / `@cosmjs/stargate`** — real connection to the Tamizhi chain (no mocks)
- **react-markdown** — rich message rendering
- **date-fns** — relative timestamps

## Project layout

```
desktop-messenger/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── scripts/gen-icons.cjs       # placeholder RGBA icon generator
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── TitleBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ChatView.tsx
│   │   ├── MessageBubble.tsx
│   │   └── ContactInfo.tsx
│   ├── hooks/
│   │   ├── useChain.ts         # CosmJS Stargate connection + heartbeat
│   │   ├── useMessages.ts      # send/receive helpers
│   │   └── useShortcuts.ts     # Cmd+N / Cmd+F / Cmd+, / Cmd+I / Esc
│   ├── store/messages.ts       # Zustand store (conversations + messages)
│   └── styles/theme.css        # indigo + gold Tamil theme
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/                  # 32/128/256/512 PNG + .icns + .ico
    └── src/
        ├── main.rs
        ├── lib.rs              # Tauri builder, plugin wiring, window-close-to-tray
        ├── notifications.rs    # native notification on new message
        └── tray.rs             # system tray with Open/Settings/Quit + unread tooltip
```

## Development

```bash
cd desktop-messenger
npm install
npm run tauri dev
```

The first `npm run tauri dev` will spend a few minutes compiling the Rust dependencies;
subsequent launches are fast.

## Production build

```bash
npm run tauri build
```

Per-platform artifacts:

| Platform | Output |
|----------|--------|
| macOS   | `src-tauri/target/release/bundle/macos/Tamizhi Messenger.app` and `.dmg` |
| Windows | `src-tauri/target/release/bundle/msi/*.msi` and `nsis/*.exe` |
| Linux   | `src-tauri/target/release/bundle/deb/*.deb`, `rpm/*.rpm`, `appimage/*.AppImage` |

### System requirements

- **macOS** 10.15 (Catalina) or later
- **Windows** 10 or later (WebView2 runtime — bundled by the MSI)
- **Linux** Ubuntu 20.04+ / Fedora 36+ (needs `webkit2gtk-4.1`)

### Code-signing notes

- **macOS**: set `APPLE_SIGNING_IDENTITY` and `APPLE_ID`/`APPLE_PASSWORD` for notarisation.
  See `BUILD.md`.
- **Windows**: pass an `.pfx` certificate via `WINDOWS_CERTIFICATE` + password env vars.
- **Linux**: AppImage doesn't require signing; `.deb`/`.rpm` are signed by the repo owner.

## Features implemented

- Multi-pane layout (sidebar + chat + collapsible info pane)
- Conversation list with search, unread badges, last-message preview
- Message bubbles with markdown, timestamps, send-status ticks
- Composer with bold/italic/code/link toolbar, file attach, drag-and-drop
- Keyboard shortcuts: Cmd+N / Cmd+F / Cmd+, / Cmd+I / Esc
- System tray with **Open / Settings / Quit** menu and unread-count tooltip
- Window close → minimise to tray (Tauri window event interception)
- Native OS notifications (via `tauri-plugin-notification`)
- Real Tamizhi chain connection via CosmJS `StargateClient` with 10 s heartbeat

## Stubbed / TODO

- Message *signing* + broadcasting via `SigningStargateClient` (currently locally appended)
- Attachment upload to the Tamizhi storage server (CIDs not yet returned)
- Voice/video call buttons in the chat header
- Settings panel (currently just a stub alert)
- Global accelerator `Cmd+Shift+T` to focus from anywhere

See `BUILD.md` for full per-platform release commands.
