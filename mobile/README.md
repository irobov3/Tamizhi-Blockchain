# Tamizhi Messenger (mobile)

End-to-end encrypted messenger built on the Tamizhi chain.
React Native + Expo 51, expo-router, zustand, react-native-webrtc,
TweetNaCl + @noble/curves for Ed25519 → X25519 boxed messaging.

## Features

- Onboarding: create / import HD wallet (BIP-39), derive Tamizhi
  session identity (Ed25519) deterministically from the mnemonic.
- 1:1 chat with X25519-XSalsa20-Poly1305 encryption (NaCl box).
- WebRTC voice & video calls with a WebSocket signaling client and
  automatic reconnect with exponential backoff.
- TMZ wallet tab — balance, send, receive (QR).
- Contacts tab with QR-code add flow.
- AI assistant conversation (Ollama-compatible endpoint).
- Persistent local store via AsyncStorage (zustand `persist`).
- Global error boundary + offline banner + telemetry shim
  (Sentry-ready).
- Haptic feedback on send / receive / call (no extra native dep).

> Screenshots: `assets/screenshots/` _(designer pass pending)_.

## Build commands

```bash
# Install
npm install

# Local dev (Metro)
npm run start

# Run on a connected Android device / emulator
npm run android

# Run on iOS simulator (macOS only)
npm run ios

# Generate / refresh native projects
npx expo prebuild --clean

# EAS — internal preview APK
eas build --platform android --profile preview

# EAS — production app bundle
npm run build:android   # alias for eas build --platform android
npm run build:ios

# Local Android APK from prebuilt project
cd android && ./gradlew assembleRelease
```

## Required environment variables

Copy `.env.example` to `.env` (or push to EAS via
`eas secret:push --scope project`).

| Variable | Purpose | Default |
| --- | --- | --- |
| `EXPO_PUBLIC_CHAIN_LCD` | Tamizhi chain REST/LCD endpoint | `http://localhost:1317` |
| `EXPO_PUBLIC_CHAIN_ID` | Chain ID | `tamizhi-1` |
| `EXPO_PUBLIC_STORAGE_URL` | Storage server (messages + WS signaling) | `http://localhost:8100` |
| `EXPO_PUBLIC_ROUTER_URL` | Onion router node | `http://localhost:8101` |
| `EXPO_PUBLIC_API_URL` | Optional Node backend | `http://localhost:4000` |
| `EXPO_PUBLIC_AI_URL` | AI assistant (Ollama-compatible) | `http://localhost:8000` |

## Project layout

```
app/                 expo-router routes
  (tabs)/            chats / contacts / wallet / settings
  chat/[id].tsx      conversation screen
  call/              incoming / outgoing / active call screens
  onboarding/        create / import wallet
src/
  api/               chain, storage, signaling, ai
  crypto/            session, wallet, txSigning, webrtc
  store/             zustand stores (app + call)
  hooks/             useMessages, useWallet, useConnectivity
  components/        UI library (Avatar, MessageBubble, ErrorBoundary, …)
  utils/             format, storage, telemetry, network, haptics
assets/              icons, splash, logos
```

## Known issues

- Push notifications are not yet wired up (planned for v1.1 — see
  Roadmap). On Android, message arrival relies on the foreground
  poller + WebSocket signaling; backgrounded delivery requires FCM.
- Group chats are modelled in the store (`Conversation.type === 'group'`)
  but no UI flow yet.
- File / image attachments and voice messages are not yet implemented.
- Read receipts and typing indicators are stubbed locally only — no
  network propagation.
- Storage server `/health` endpoint is assumed for the connectivity
  probe; the banner will show "offline" if that route is missing.

## Roadmap

- [ ] FCM / APNs push via `expo-notifications` + storage-server hook.
- [ ] Group chat UI (membership management, fan-out send).
- [ ] Image & file attachments (resumable upload via storage server).
- [ ] Voice messages (record → encrypt → store as attachment).
- [ ] Read receipts & typing indicators over the signaling channel.
- [ ] Block / mute users.
- [ ] Sentry wiring (replace `src/utils/telemetry.ts` stubs).
- [ ] Designer pass on icons / splash with Tamil "த" treatment.
- [ ] CI/CD: GitHub Actions workflow → EAS build on tag.

## CI/CD (sketch)

```yaml
# .github/workflows/build.yml
name: build
on:
  push:
    tags: ['v*']
jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: mobile/package-lock.json }
      - run: npm ci
        working-directory: mobile
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
      - run: eas build --platform android --profile production --non-interactive
        working-directory: mobile
```
