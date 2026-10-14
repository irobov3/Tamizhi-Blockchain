# Tamizhi Wallet — Mobile

Native iOS + Android wallet for the Tamizhi blockchain.

## Tech Stack
- Expo 51 + React Native 0.74 + TypeScript
- `@cosmjs/stargate` + `@cosmjs/proto-signing` for chain interaction
- `bip39` + `@noble/curves` for keystore
- `expo-secure-store` for encrypted storage
- `expo-local-authentication` for biometric

## Screens
- **Dashboard** — TMZ balance, recent transactions, quick actions
- **Send** — bech32 validation, amount, memo, fee estimate, biometric confirm
- **Receive** — QR code + copy address
- **Stake** — validator list, delegate, claim rewards
- **Settings** — network, security, backup, reset

## Onboarding
- Create new (24-word BIP39 mnemonic, confirm 4 random words)
- Import existing
- PIN + biometric setup

## Development

```bash
cd mobile-wallet
npm install
npx expo prebuild --clean    # regenerate native iOS/Android projects
npm start                    # Metro bundler
```

## Builds

```bash
# Android APK (via EAS)
eas build --platform android --profile preview

# iOS (via EAS)
eas build --platform ios --profile preview

# Local Android (requires Android SDK)
cd android && ./gradlew assembleRelease
```

## Configuration

The chain RPC/REST endpoints default to localhost. Override via `app.json` extras
or `.env`:

```
EXPO_PUBLIC_RPC_URL=https://rpc.tamizhi.ai
EXPO_PUBLIC_REST_URL=https://api.tamizhi.ai
EXPO_PUBLIC_CHAIN_ID=tamizhi-1
```

## Security Notes

- Mnemonic encrypted at rest in `expo-secure-store` with PIN-derived key
- Biometric required for sends (configurable)
- Plaintext mnemonic only held in memory after unlock
- For production: replace stub PIN-derivation with Argon2

## Roadmap

- [x] Send / receive TMZ
- [x] Validator list + delegation
- [x] Multi-network (testnet/mainnet)
- [ ] Multi-wallet support
- [ ] Hardware wallet (Ledger BLE)
- [ ] Address book
- [ ] Transaction notifications
- [ ] CosmWasm contract interactions
