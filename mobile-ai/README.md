# Tamizhi AI

Tamil-aware mobile AI assistant. Built with React Native + Expo 51, sharing the
same stack as the Tamizhi messenger.

## Features

- Streaming Claude (Anthropic) responses with markdown rendering
- Tamil-first UI (with English subtitles) — Thirukkural / Sangam-aware system prompt
- Suggested Tamil prompts and a saved-prompts library
- Voice input (hold-to-talk recording via `expo-av`) + TTS via `expo-speech` with `ta-IN`
- Local conversation history persisted to `expo-secure-store`
- Provider switch: Claude (Anthropic) — OpenAI/Ollama scaffolded as stubs
- Optional on-chain usage logging via `accesslog` module on the Tamizhi chain

## Required environment

Create `.env` from `.env.example`:

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...      # optional default; users can also set in-app
EXPO_PUBLIC_CHAIN_LCD=http://localhost:1317   # for optional usage logging
EXPO_PUBLIC_CHAIN_ID=tamizhi-1
```

You can also enter the API key from **Settings → AI Provider → Anthropic API Key**.
The key is stored on-device using `expo-secure-store` and is **never sent to chain**.

## Run dev

```
npm install
npm start
```

Open in Expo Go (limited — voice recording needs a dev build) or:

```
npx expo run:ios
npx expo run:android
```

## Build APK (preview)

```
eas build --platform android --profile preview
```

## Build iOS

```
eas build --platform ios --profile preview
```

## Project layout

```
app/
  _layout.tsx                Root stack + hydration
  (tabs)/
    _layout.tsx              Bottom tabs
    index.tsx                Home — recent + suggestions + new-chat CTA
    chat.tsx                 Active chat with streaming
    library.tsx              Saved prompts
    settings.tsx             Provider, API key, voice, language
  conversation/[id].tsx      Conversation detail (share / delete / continue)
src/
  ai/
    anthropic.ts             Streaming Claude wrapper (raw fetch + SSE)
    stream.ts                Generic SSE parser
    voice.ts                 expo-av recording, expo-speech TTS, transcribe stub
  api/usage.ts               Optional accesslog chain logger
  components/                MessageBubble, StreamingText, VoiceInputButton, etc.
  store/conversations.ts     Zustand store, persisted to SecureStore
  store/settings.ts          Zustand store, persisted to SecureStore
  utils/tamil.ts             Tamil-script detection + localized timestamps
  config.ts                  Theme, endpoints, default model, system prompt
```

## Stubs / TODOs

- **STT transcription** (`src/ai/voice.ts → transcribe`) — recordings are captured
  but transcription is not wired. Drop in your STT provider (Whisper, platform
  Voice, Anthropic audio when available).
- **OpenAI / Ollama providers** — UI selectable but `chat.tsx` only calls the
  Anthropic streamer today.
- **Chain usage logging** (`src/api/usage.ts`) — REST shape only; sign + broadcast
  via your wallet flow when ready.
- **Image attach** button is rendered but not yet wired to a picker.

## Privacy

- API keys live on-device in `expo-secure-store`.
- Conversations live on-device in `expo-secure-store`.
- Nothing is sent to the Tamizhi chain unless you explicitly opt into usage
  logging (off by default).
