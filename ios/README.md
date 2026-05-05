# Tamizhi iOS App

Tamil Digital Sovereignty — iOS wallet, messenger, literature browser, and AI assistant.

## Requirements

- Xcode 15+
- iOS 16+ deployment target
- macOS 13+ (Ventura) for building
- Swift 5.9

## Getting Started

1. **Open the project**
   ```bash
   open ios/Tamizhi.xcodeproj
   ```

2. **Set signing team**
   - Select the `Tamizhi` target
   - Go to _Signing & Capabilities_
   - Set your Apple Developer Team

3. **Configure API endpoints**
   Edit `Tamizhi/Supporting Files/AppConfig.swift` or update the custom keys in `Info.plist`:
   - `TamizhiAPIURL` — Backend REST API
   - `TamizhiChainRPC` — Tendermint RPC
   - `TamizhiChainLCD` — Cosmos LCD REST
   - `TamizhiChainID` — e.g. `tamizhi-1`
   - `TamizhiIPFSGateway` — IPFS gateway
   - `TamizhiWSURL` — WebSocket endpoint

4. **Run on simulator**
   - Select an iPhone 15 simulator
   - Press ⌘R

## Features

| Feature | Description |
|---------|-------------|
| **Wallet** | Create/import Cosmos wallet, send/receive TMZ tokens, view transaction history |
| **Messenger** | End-to-end encrypted messaging using X25519 key exchange + XSalsa20-Poly1305 |
| **Literature** | Browse, search, and upload Tamil literary works stored on IPFS with on-chain proofs |
| **AI Assistant** | Tamizhi AI specialised in Tamil literature, history, and language — Tamil/English toggle |

## Architecture

```
Tamizhi/
├── TamizhiApp.swift          # App entry + SwiftUI @main
├── ContentView.swift         # Tab bar container
├── Supporting Files/
│   ├── AppState.swift        # Global @MainActor ObservableObject
│   ├── AppConfig.swift       # Info.plist-based configuration
│   └── Info.plist
├── Core/
│   ├── Crypto/               # CryptoService (Ed25519 + X25519)
│   ├── Network/              # APIClient, ChainClient
│   ├── Storage/              # CoreDataStack, KeychainManager
│   ├── Models/               # Wallet, Message, Conversation, LiteraryWork, Transaction
│   └── Extensions/           # Color+Tamizhi, String+Tamil, View+Extensions
└── Features/
    ├── Wallet/               # WalletView, SendView, ReceiveView, WalletViewModel
    ├── Messenger/            # ConversationListView, ChatView, MessengerViewModel
    ├── Literature/           # LiteratureView, LiteratureDetailView, LiteratureViewModel
    └── AI/                   # AIView, AIViewModel
```

## Configuration

For local development, all endpoints fall back to `localhost`:

```
API:   http://localhost:3000
RPC:   http://localhost:26657
LCD:   http://localhost:1317
WS:    ws://localhost:3000
IPFS:  https://ipfs.io
```

Start the full stack with Docker:

```bash
cd ../infra && docker compose up
```

## Tamil Font Support

The app includes Noto Sans Tamil for proper rendering. Ensure the fonts are added to the Xcode target's _Copy Bundle Resources_ phase.

## Privacy Permissions

The following permissions are declared in `Info.plist`:

- **Camera** — QR code scanning for wallet addresses
- **Face ID** — Biometric authentication
- **Photo Library** — Literature uploads and QR code saving
- **Microphone** — Voice-to-text Tamil input in AI

## Build for Production

1. Select _Product → Archive_
2. In Organizer, click _Distribute App_
3. Choose App Store Connect or Ad Hoc distribution
