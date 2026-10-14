# Tamizhi Messenger Changelog

## v1.0.1 (unreleased) — May 4, 2026

### Added
- Global `ErrorBoundary` at the root of the app — catches render errors,
  reports them via the telemetry shim, and shows a friendly recovery
  screen with a "Try again" button instead of a blank crash.
- Pluggable telemetry / crash-reporting shim
  (`src/utils/telemetry.ts`) — Sentry-compatible surface
  (`reportError`, `reportMessage`, `setUser`, `addBreadcrumb`) so the
  rest of the app never imports Sentry directly. Wire-up notes inline.
- Network resilience helpers (`src/utils/network.ts`):
  - `withRetry()` — exponential backoff + jitter, status-aware
    `shouldRetry` predicate. Now wrapping `storage.sendMessage` and
    `storage.fetchMessages`.
  - `probeConnectivity()` — lightweight HEAD probe of the storage
    server, no native NetInfo dependency.
- `useConnectivity()` hook + `OfflineBanner` overlay that slides in when
  the WebSocket is down or the storage server is unreachable.
- Haptic feedback helper (`src/utils/haptics.ts`) using the built-in
  `Vibration` API (no `expo-haptics` native dep). Triggers on send,
  delivery, send-failure, incoming message, and incoming call.
  Respects the existing `vibrationEnabled` setting.
- Telemetry breadcrumbs for auth restore, incoming calls, and message
  receive — gives crash reports useful context once Sentry is wired in.

### Changed
- `_layout.tsx` now wraps the app in `<ErrorBoundary>` and renders the
  `<OfflineBanner>` overlay above all screens.
- `storage.sendMessage` retries on network/5xx but bails on 4xx.
- `storage.fetchMessages` retries once before giving up (poller will
  pick it up on the next tick anyway).

### Notes
- App icons (`icon.png`, `adaptive-icon.png`, `splash-icon.png`) are
  already 1024×1024 PNGs at the right paths. A designer pass for the
  Tamil "த" treatment is still recommended before store submission.

## v1.0.0 — May 2, 2026
- Initial APK release (136 MB signed Android build).
- Onboarding (create / import wallet), encrypted 1:1 chat, contacts,
  TMZ wallet, settings, WebRTC voice & video calls, AI assistant chat.
