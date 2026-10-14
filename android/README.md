# Tamizhi Android App

Tamizhi is a Tamil cultural blockchain application featuring a non-custodial wallet, end-to-end encrypted messenger, Tamil literary archive, and a Tamil AI assistant.

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Android Studio | Hedgehog 2023.1.1+ | Or Iguana / Jellyfish |
| JDK | 17 | Must be set as Project SDK |
| Android Gradle Plugin | 8.5.0 | Defined in `gradle/libs.versions.toml` |
| Kotlin | 2.0.0 | |
| Min Android SDK | 26 (Android 8.0) | |
| Target Android SDK | 34 | |

---

## Architecture

```
com.tamizhi.app
├── TamizhiApplication.kt         Hilt application entry point
├── MainActivity.kt                Single-activity host
├── TamizhiNavigation.kt          NavHost + bottom nav
│
├── common/
│   └── ui/
│       ├── theme/                Theme, Typography, Color tokens
│       └── components/           Reusable Compose components
│
├── core/
│   ├── data/
│   │   ├── local/                Room DB, entities, DAOs, CryptoManager
│   │   └── remote/               Retrofit APIs, DTOs
│   ├── di/                       Hilt modules (App, DB, Network)
│   └── domain/
│       ├── model/                Domain models (Wallet, Message, LiteraryWork…)
│       └── repository/           Repository interfaces
│
└── feature/
    ├── wallet/
    │   ├── ui/                   WalletScreen, SendScreen, ReceiveScreen, OnboardingScreen
    │   └── viewmodel/            WalletViewModel
    ├── messenger/
    │   ├── ui/                   ConversationListScreen, ChatScreen
    │   └── viewmodel/            MessengerViewModel
    ├── literature/
    │   ├── ui/                   LiteratureScreen, LiteratureDetailScreen
    │   └── viewmodel/            LiteratureViewModel
    └── ai/
        └── ui/                   AIScreen, AIViewModel
```

**Design pattern:** MVVM + Repository + Hilt DI.  
**UI:** 100% Jetpack Compose, Material 3 dark theme.  
**State:** Kotlin `StateFlow` / `SharedFlow`.  
**Local persistence:** Room + DataStore + EncryptedSharedPreferences.  
**Networking:** Retrofit 2 + OkHttp + Gson.  
**Crypto:** libsodium (lazysodium-android) for NaCl box E2E encryption.

---

## Configuration

### gradle.properties

Add the following to `android/gradle.properties` (never commit secrets):

```properties
# Backend REST API
BACKEND_BASE_URL=https://api.tamizhi.ai/v1/

# Cosmos / Tamizhi chain RPC
CHAIN_RPC_URL=https://rpc.tamizhi.ai/
CHAIN_REST_URL=https://rest.tamizhi.ai/

# Chain parameters
CHAIN_ID=tamizhi-1
DENOM=utmz
DISPLAY_DENOM=tmz
BECH32_PREFIX=tamizhi
```

These values are injected into `BuildConfig` fields via `build.gradle.kts`:

```kotlin
buildConfigField("String", "BACKEND_BASE_URL", "\"${project.property("BACKEND_BASE_URL")}\"")
```

---

## Build Commands

### Debug build (APK)
```bash
cd android
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

### Release build (signed APK)
```bash
./gradlew assembleRelease
```

### Release AAB (Google Play)
```bash
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Install on connected device
```bash
./gradlew installDebug
```

### Run unit tests
```bash
./gradlew test
```

### Run instrumented tests
```bash
./gradlew connectedAndroidTest
```

### Clean build
```bash
./gradlew clean assembleDebug
```

---

## Font Setup

The app uses **Noto Sans Tamil** and **Noto Serif Tamil** for Tamil script rendering. Place the following font files in `app/src/main/res/font/`:

| File | Source |
|------|--------|
| `noto_sans_tamil_regular.ttf` | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+Tamil) |
| `noto_sans_tamil_medium.ttf` | Google Fonts |
| `noto_sans_tamil_semibold.ttf` | Google Fonts |
| `noto_sans_tamil_bold.ttf` | Google Fonts |
| `noto_serif_tamil_regular.ttf` | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Serif+Tamil) |
| `noto_serif_tamil_medium.ttf` | Google Fonts |
| `noto_serif_tamil_semibold.ttf` | Google Fonts |
| `noto_serif_tamil_bold.ttf` | Google Fonts |

Download from Google Fonts → "Download family" → copy the `.ttf` files (weight variants) into `res/font/`. File names must be lowercase with underscores.

---

## Key Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Jetpack Compose BOM | 2024.06.00 | UI framework |
| Hilt | 2.51.1 | Dependency injection |
| Room | 2.6.1 | Local SQLite ORM |
| Retrofit | 2.11.0 | REST networking |
| OkHttp | 4.12.0 | HTTP client + logging |
| DataStore | 1.1.1 | Preferences storage |
| Security Crypto | 1.1.0-alpha06 | EncryptedSharedPreferences |
| lazysodium-android | 2.0.2 | NaCl E2E encryption |
| Coil | 2.6.0 | Image loading |
| ZXing | 4.3.0 | QR code scan/generate |
| Timber | 5.0.1 | Logging |

Full version catalog: `android/gradle/libs.versions.toml`

---

## Running in Android Studio

1. Open Android Studio → **File → Open** → select the `android/` folder.
2. Wait for Gradle sync to complete.
3. Add the font files to `app/src/main/res/font/` (see Font Setup above).
4. Set environment values in `gradle.properties`.
5. Select a device or emulator (API 26+).
6. Click **Run ▶** or press `Shift+F10`.

---

## Tamizhi Chain

Tamizhi runs on a Cosmos SDK–based blockchain with:
- **Denom:** `utmz` (micro-TMZ), display as `TMZ`
- **Bech32 prefix:** `tamizhi1`
- **Key scheme:** secp256k1 (BIP-44 path `m/44'/118'/0'/0/0`)
- **Messaging encryption:** X25519 key exchange + NaCl secretbox

---

## License

MIT © Tamizhi Foundation
