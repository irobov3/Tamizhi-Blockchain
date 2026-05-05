# Tamizhi AI — Desktop

Native AI assistant for Windows, macOS, and Linux. Tamil-language fluent.

## Tech
- Tauri 2 + Rust
- React 18 + TypeScript + Vite
- Anthropic Claude (claude-sonnet-4-5)
- pdfjs-dist for PDF parsing

## Setup
```bash
npm install
```

Set your Anthropic API key in Settings (encrypted via Tauri Store plugin).

## Development
```bash
npm run tauri dev
```

## Build
```bash
npm run tauri build   # produces .app / .exe / .deb / .AppImage
```

## Privacy
- Conversations stored locally (encrypted)
- API keys never leave the device
- Optional: log usage to Tamizhi chain via accesslog module
