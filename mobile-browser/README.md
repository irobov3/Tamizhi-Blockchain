# Tamizhi Browser — Mobile

Web3-aware mobile browser for the Tamizhi network.

## Features

- WebView-based multi-tab browsing
- Built-in Tamizhi wallet
- `window.tamizhi` provider injected into every page
- IPFS gateway support
- Custom `tamizhi://` URL scheme
- Bookmarks, history, search

## Web3 Provider API

Pages can interact with the Tamizhi chain via the injected provider:

```js
// Wait for provider
window.addEventListener("tamizhi#initialized", async () => {
  const accounts = await window.tamizhi.enable();
  const signed = await window.tamizhi.signAmino(signer, signDoc);
  // ...
});
```

Methods exposed:
- `enable()` — request user permission, returns connected account
- `getAccounts()` — return connected accounts
- `signAmino(signer, signDoc)` — sign in legacy amino format
- `signDirect(signer, signDoc)` — sign in proto direct format

## URL Schemes

- `https://`, `http://` — standard web pages (rendered in WebView)
- `ipfs://CID` — resolved through configurable IPFS gateway
- `tamizhi://wallet` — open built-in wallet UI
- `tamizhi://settings` — open browser settings

## Tech Stack
- Expo 51 + React Native + TypeScript
- `react-native-webview` for page rendering
- `@cosmjs/proto-signing` for tx signing
- `expo-secure-store` for encrypted wallet keystore

## Development

```bash
cd mobile-browser
npm install
npx expo prebuild --clean
npm start
```

## Builds

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

## Roadmap

- [x] Multi-tab UI
- [x] Bookmarks + history
- [x] Web3 provider injection
- [x] IPFS gateway
- [ ] Native dApp directory
- [ ] Per-domain permission management UI
- [ ] Cookie isolation
- [ ] Tor / Mixnet routing (privacy mode)
