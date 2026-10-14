# Tamizhi (TMZ) — Sovereign Layer-1 Blockchain Network

[![Cosmos SDK](https://img.shields.io/badge/Cosmos_SDK-v0.50.9-2B3137?style=flat&logo=cosmos)](https://github.com/cosmos/cosmos-sdk)
[![CometBFT](https://img.shields.io/badge/CometBFT-v0.38.11-4B5563?style=flat)](https://github.com/cometbft/cometbft)
[![CosmWasm](https://img.shields.io/badge/CosmWasm-v2.1.4-F97316?style=flat)](https://cosmwasm.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20|%20Linux-green.svg)]()

**Tamizhi** is a high-performance, sovereign Layer-1 blockchain built on the **Cosmos SDK v0.50** and **CometBFT**, with native **CosmWasm v2** smart contract capabilities. 

Tamizhi is engineered for:
1. **Classical Literature & Cultural Heritage Tokenization** (Verifiable CW721 Literary NFTs).
2. **Decentralized Privacy-Preserving Communication** (Session registry, onion-routing, WebRTC signaling).
3. **Decentralized Storage & Content Addressing** (IPFS pinning + Arweave permanent archiving).
4. **Decentralized Service Node Network** (Incentivized compute, translation, and AI inference).
5. **Deflationary Economics** (Automated 20% protocol fee burn built into the AnteHandler).

---

## 🏛️ Vision & Core Use Cases

### 1. Classical Literature Preservation & Literary NFTs
Ancient literary masterpieces, historic manuscripts, and cultural canons (such as the *Thirukkural*, Sangam anthologies, and epic treatises) face the risks of digital rot, centralized censorship, and fragmented copyright verification.

* **On-Chain Literary CW721 NFTs**: Immutably records literary works with cryptographic metadata, including SHA-256 text digests, IPFS CIDs, verified translations, and author provenance.
* **Granular Rights & Licensing**: On-chain verification of public domain status, academic licensing, and creator royalties.
* **Smart Contract Powered**: Production-tested via CosmWasm (`literary-nft.wasm`), allowing permissionless querying, verification, and collector minting.

### 2. Decentralized, Encrypted Communications
* **On-Chain Session Registry**: Facilitates cryptographic identity lookup and public key exchange without relying on centralized phone numbers or email registries (`x/messaging`).
* **Multi-Hop Onion Routing**: Nodes relay end-to-end encrypted payloads across a mesh network.
* **P2P WebRTC Signaling**: Decentralized discovery for secure voice, video, and text communication.

### 3. Decentralized Storage & Verification
* **Dual-Tier Storage Architecture**: High-speed IPFS pinning for active caching paired with Arweave for permanent, immutable archival storage.
* **Audit & Access Trails**: Custom `x/accesslog` module provides zero-knowledge-ready, tamper-proof audit trails for sensitive data access and document verification.

### 4. Decentralized AI & Service Node Staking
* **Incentivized Compute**: Independent node operators register as Service Nodes by staking **15,000 TMZ** (`x/nodes`).
* **Micro-Reward Economics**: Workers earn protocol rewards for running language models, translation engines, content indexing, and storage relays (`x/rewards`).
* **Network Security & Governance**: Protocol-level threat reporting and governance-managed blocklist enforcement (`x/security`).

### 5. Deflationary Tokenomics ($TMZ)
* **Genesis Supply**: Exactly **1,000,000,000 TMZ** (`1,000,000,000,000,000 utmz`).
* **Automated 20% Fee Burn**: Integrated into the Cosmos SDK AnteHandler (`FeeBurnDecorator`). Every transaction automatically burns 20% of gas fees from the `FeeCollector`, continuously shrinking the circulating supply as network activity increases.

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Client Applications
        WEB[Tamizhi Web Portal & Explorer]
        D_WALLET[Desktop Wallet]
        D_CHAT[Desktop Messenger]
        D_AI[Desktop AI Assistant]
        ULAA[Ulaa Privacy Browser]
        MOBILE[Mobile Apps iOS / Android]
    end

    subgraph Service Layer
        GATEWAY[IPFS Storage Gateway]
        RELAY[WebSocket Relay Server]
        BOTS[Discord & Telegram Bots]
    end

    subgraph Tamizhi L1 Blockchain (Cosmos SDK v0.50 + CometBFT)
        CONSENSUS[CometBFT BFT Consensus Engine]
        ANTE[AnteHandler & FeeBurnDecorator (20% Burn)]
        
        subgraph Core & Custom Modules
            WASM[x/wasm - CosmWasm v2 Smart Contracts]
            LIT_NFT[literary-nft.wasm Contract]
            NODES[x/nodes - Service Node Staking]
            REWARDS[x/rewards - Activity Incentives]
            SECURITY[x/security - Threat & Governance Blocklist]
            ACCESS[x/accesslog - Audit Logging]
            MSG[x/messaging - Session & Group Registry]
            BANK[x/bank & x/gov]
        end
    end

    WEB -->|REST / RPC| CONSENSUS
    D_WALLET -->|gRPC / RPC| CONSENSUS
    ULAA --> GATEWAY
    D_CHAT --> RELAY
    WASM --> LIT_NFT
    CONSENSUS --> ANTE
    ANTE --> BANK
```

---

## ⚡ Quickstart

### 1. Prerequisites
* **macOS** (Apple Silicon arm64 / Intel) or **Linux** (x86_64 / arm64)
* **Go**: 1.21+
* **Node.js**: 20+
* **Rust & Cargo**: 1.75+ (for CosmWasm contracts)
* **jq**: `brew install jq` (macOS) or `sudo apt install jq` (Linux)

### 2. Inspect Binary Version
```bash
chain/build/tamizhi version
# Output: v0.1.0
```

### 3. Automated Localnet & Module Smoke Tests
To spin up a fresh local network, generate testnet keys, validate genesis, and run the automated end-to-end verification suite:

```bash
bash chain/scripts/self-test-runner.sh
```

### 4. Start a Persistent Single Validator Node Manually
```bash
bash chain/scripts/start-localnet.sh
```

### 5. Check Network Health & Endpoints
In a separate terminal:
```bash
bash chain/scripts/check-chain.sh
```

---

## 📜 Smart Contracts (CosmWasm CW721)

Tamizhi supports state-of-the-art WebAssembly smart contracts powered by `wasmd` / CosmWasm v2.

### Deploying & Minting a Literary NFT
The repository includes the compiled, optimized `literary-nft.wasm` contract. To upload, instantiate, and mint on a running localnet:

```bash
bash contracts/scripts/deploy-contract.sh
```

#### What this script does:
1. **Stores Code**: Uploads `literary_nft.wasm` to the chain (`code_id: 1`).
2. **Instantiates Contract**: Initializes the collection with name `"Tamizhi Classical Literature"`, symbol `"TLIT"`.
3. **Mints Token**: Mints Thirukkural Kural #1 (`token_id: "thirukkural-kural-1"`) with on-chain metadata and IPFS CID.
4. **Queries Verification**: Queries the contract state:
   ```bash
   tamizhi query wasm contract-state smart <CONTRACT_ADDRESS> '{"work_info":{"token_id":"thirukkural-kural-1"}}'
   ```

---

## 🌐 Network Interfaces & API Endpoints

When your localnet node is running, the following endpoints are available:

| Protocol | Address | Description |
|----------|---------|-------------|
| **CometBFT RPC** | `http://localhost:26657` | Block inspection, tx broadcast, consensus status |
| **Cosmos REST LCD** | `http://localhost:1317` | REST queries for all modules and contracts |
| **gRPC** | `localhost:9090` | High-throughput client queries & event streaming |
| **pProf** | `http://localhost:6060` | Runtime profiling |

### Custom REST Endpoints
* **Reward Rules**: `GET http://localhost:1317/tamizhi/rewards/v1/rules`
* **Active Service Nodes**: `GET http://localhost:1317/tamizhi/nodes/v1/nodes`
* **Threat Telemetry**: `GET http://localhost:1317/tamizhi/security/v1/threats`
* **Audit Logs**: `GET http://localhost:1317/tamizhi/accesslog/v1/logs`
* **Messaging Nodes**: `GET http://localhost:1317/tamizhi/messaging/v1/nodes`

---

## 📦 Repository Structure

```
.
├── chain/                  # Layer-1 Cosmos SDK Blockchain Node
│   ├── app/                # App wiring, AnteHandler, and FeeBurnDecorator
│   ├── cmd/tamizhid/       # Binary CLI entrypoint (tamizhi)
│   ├── config/             # Reference configurations and validated genesis
│   ├── scripts/            # Localnet start, self-test runner, health check
│   └── x/                  # Custom Cosmos modules (nodes, rewards, security, etc.)
├── contracts/              # CosmWasm Rust Smart Contracts
│   ├── artifacts/          # Compiled .wasm binaries (literary_nft.wasm)
│   ├── literary-nft/       # Rust source code for CW721 literary NFT
│   └── scripts/            # Deployment and minting test scripts
├── explorer/               # Blockchain Explorer Web App
├── web/                    # Next.js 14 Main Ecosystem Portal & Dashboard
├── desktop-wallet/         # Electron desktop wallet for $TMZ token management
├── desktop-messenger/      # P2P encrypted messaging desktop client
├── desktop-ai/             # Desktop AI interface connected to Tamizhi Service Nodes
├── ulaa-browser/           # Privacy-first browser with Web3 & IPFS integration
├── mobile/                 # React Native / Expo cross-platform mobile suite
├── storage/                # IPFS and decentralized storage integration services
├── services/               # WebSocket relays and ecosystem bots (Discord/Telegram)
├── protocol/               # TypeScript implementation of the P2P encryption protocol
└── sdk/                    # Client SDKs for TypeScript / JavaScript
```

---

## 🔒 Security & Contribution

* **Tamizhi Core** follows strict fail-closed security standards. All sensitive governance operations (reward creation, address blocking, network upgrades) require consensus authority.
* Never commit private keys, mnemonics, or production `.env` files to git.
* Bug reports, RFCs, and pull requests are welcomed via GitHub Pull Requests.

---

## 📄 License
This project is licensed under the [Apache 2.0 License](LICENSE).
