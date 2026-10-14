# Tamizhi Chain — Technical Architecture

## 1. Overview

Tamizhi is a purpose-built Layer 1 blockchain for preserving and monetising Tamil literary heritage. It combines:

- **Permanent on-chain storage** of literary works with cryptographic content hashes.
- **NFT ownership** of individual works via a CosmWasm literary-nft contract.
- **Node operator incentives** — operators who index and serve literary content earn on-chain staking rewards proportional to their `UptimeScore × MessagesStored`.
- **Access logging** — every content access is recorded via the accesslog module with optional IBC relay to partner chains.
- **Community governance** — parameter changes and treasury disbursements are controlled by 3-of-5 multisig (emergency) and on-chain governance proposals (major changes).

### Why Cosmos SDK?

| Requirement | Cosmos SDK answer |
|-------------|-------------------|
| Custom module logic | `x/` modules with full keeper access |
| Interoperability | IBC v7 built-in |
| Smart contracts | CosmWasm integration |
| Validator economics | Staking + distribution modules |
| Governance | gov module with parameter subspaces |
| Upgrade safety | Cosmovisor + upgrade module |
| Tooling ecosystem | CosmJS, grpcurl, Ignite, buf |

**SDK version**: Cosmos SDK v0.50.9
**CosmWasm version**: v0.53.0
**IBC version**: v7.x

---

## 2. Chain Architecture

### 2.1 Module Dependency Graph (ASCII)

```
                        ┌────────────────┐
                        │   bank / auth  │  (Cosmos SDK stdlib)
                        └───────┬────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
   ┌──────▼──────┐      ┌──────▼──────┐      ┌────────▼────────┐
   │   identity  │      │    nodes    │      │    security     │
   │  (profiles) │      │ (operators) │      │ (blocklist/rate)│
   └──────┬──────┘      └──────┬──────┘      └────────┬────────┘
          │                    │                       │
          │            ┌───────▼──────┐                │
          │            │   rewards    │◄───────────────┘
          │            │  (escrow)    │
          │            └───────┬──────┘
          │                    │
   ┌──────▼──────┐      ┌──────▼──────┐
   │  literature │      │  messaging  │
   │  (works)    │      │  (P2P msgs) │
   └──────┬──────┘      └──────┬──────┘
          │                    │
   ┌──────▼──────┐      ┌──────▼──────┐
   │    nft      │      │  accesslog  │◄── IBC middleware
   │ (ownership) │      │  (audit log)│
   └─────────────┘      └─────────────┘
          │
   ┌──────▼──────┐
   │   feeburn   │
   │  (20% burn) │
   └─────────────┘
```

### 2.2 Ante Handler Chain

Every transaction passes through the following decorator chain in order. A decorator that returns an error aborts the tx before any state changes.

```
1. SetUpContextDecorator          — set gas meter, block timeout
2. BlocklistDecorator             — reject senders/recipients on security module blocklist
3. RateLimitDecorator             — reject if sender exceeds per-block tx quota
4. ValidateBasicDecorator         — stateless ValidateBasic() on all msgs
5. TxTimeoutHeightDecorator       — reject tx if past its timeout height
6. ValidateMemoDecorator          — enforce memo length limit
7. ConsumeGasForTxSizeDecorator   — charge gas proportional to tx bytes
8. DeductFeeDecorator             — transfer fee from sender to fee collector
9. FeeBurnDecorator               — burn 20% of collected fee (feeburn module)
10. SetPubKeyDecorator            — set pubkey on account if first tx
11. SigVerificationDecorator      — verify all signatures
```

### 2.3 IBC Middleware Stack

AccessLog middleware wraps the standard IBC transfer application to record every cross-chain transfer in the accesslog store.

```
IBC Core (channel/port)
    └── ICS-20 Transfer App
            └── AccessLog Middleware   ← wraps OnRecvPacket / OnAcknowledgementPacket
                    └── Standard transfer logic
```

The middleware writes an `AccessLogEntry` for each received/acknowledged packet, keyed by `{channel}/{sequence}`. This provides an immutable audit trail for cross-chain literary asset transfers.

---

## 3. Module Reference

| Module | Store Key | Key Messages | Key Queries | Events Emitted |
|--------|-----------|-------------|-------------|----------------|
| **rewards** | `rewards` | `MsgIssueReward`, `MsgCreateRewardRule`, `MsgClaimReward` | `QueryRewardRules`, `QueryPendingRewards`, `QueryRewardHistory` | `EventRewardIssued`, `EventRewardClaimed`, `EventRuleCreated` |
| **nodes** | `nodes` | `MsgRegisterNode`, `MsgUpdateNodeStatus`, `MsgUpdateUptimeScore` | `QueryNode`, `QueryAllNodes`, `QueryNodesByStatus` | `EventNodeRegistered`, `EventNodeJailed`, `EventUptimeUpdated` |
| **accesslog** | `accesslog` | `MsgLogAccess` | `QueryAccessLog`, `QueryAccessLogByWork` | `EventAccessLogged` |
| **security** | `security` | `MsgBlockAddress`, `MsgUnblockAddress`, `MsgRaiseThreatFlag`, `MsgSetRateLimit` | `QueryBlocklist`, `QueryThreatFlags`, `QueryRateLimit` | `EventAddressBlocked`, `EventAddressUnblocked`, `EventThreatFlagged` |
| **messaging** | `messaging` | `MsgSendMessage`, `MsgAcknowledgeMessage` | `QueryMessages`, `QueryMessageThread` | `EventMessageSent`, `EventMessageAcknowledged` |
| **identity** | `identity` | `MsgCreateProfile`, `MsgUpdateProfile`, `MsgVerifyProfile` | `QueryProfile`, `QueryProfileByAddress` | `EventProfileCreated`, `EventProfileVerified` |
| **literature** | `literature` | `MsgSubmitWork`, `MsgUpdateWork`, `MsgCertifyWork` | `QueryWork`, `QueryAllWorks`, `QueryWorksByAuthor` | `EventWorkSubmitted`, `EventWorkCertified` |
| **nft** | `nft` | `MsgMintNFT`, `MsgTransferNFT`, `MsgBurnNFT` | `QueryNFT`, `QueryNFTsByOwner`, `QueryCollection` | `EventNFTMinted`, `EventNFTTransferred`, `EventNFTBurned` |
| **feeburn** | `feeburn` | _(none — operates in ante handler)_ | `QueryBurnStats`, `QueryParams` | `EventFeesBurned` |

---

## 4. Token Economics

### Supply

| Parameter | Value |
|-----------|-------|
| Token name | Tamizhi Token |
| Symbol | TMZ |
| Base denom | `utmz` (micro-TMZ) |
| Decimals | 6 |
| Total supply | 1,000,000,000 TMZ (1 billion) |
| Total supply in base denom | 1,000,000,000,000,000 utmz |

### Distribution

| Allocation | % | Amount (TMZ) | Vesting |
|-----------|---|-------------|---------|
| Community Treasury | 40% | 400,000,000 | None (DAO-controlled) |
| Ecosystem & Grants | 25% | 250,000,000 | None (disbursed by governance) |
| Team | 20% | 200,000,000 | 4yr linear, 1yr cliff |
| Validators / Staking | 10% | 100,000,000 | None (staking rewards) |
| Advisors | 5% | 50,000,000 | 2yr linear |

### Fee Model

- **Minimum fee**: 1,000 utmz per transaction.
- **Fee split**: 20% burned permanently (`feeburn` module), 80% distributed to validators and community pool via the standard `distribution` module.
- The burn rate is a governance parameter (`feeburn.burn_rate`); the 20% default is set in genesis.

### Staking & Node Rewards

- Node operators must self-delegate a minimum of **15,000 TMZ** to participate.
- Per-epoch reward = `UptimeScore × MessagesStored × RewardRate`.
  - `UptimeScore`: 0–100, updated by the nodes module each block.
  - Nodes with `UptimeScore < 20` are automatically jailed (slashed 1% of stake, 0.5% burned).
- Additional milestone rewards for employees are issued via `MsgIssueReward` against on-chain `RewardRule` records (configurable by governance).

### Vesting

Vesting accounts are defined in genesis as `ContinuousVestingAccount` (team) and `DelayedVestingAccount` (advisors, unlocked at cliff). The community treasury is a module account controlled by a governance sub-DAO.

---

## 5. Security Model

### Blocklist

The `security` module maintains an on-chain address blocklist. The `BlocklistDecorator` in the ante handler rejects any transaction whose `From` or `To` address appears on the list. Additions and removals require the 3-of-5 multisig admin to submit `MsgBlockAddress` / `MsgUnblockAddress`.

### Rate Limiting

`RateLimitDecorator` enforces per-address transaction quotas configurable via `MsgSetRateLimit`. Default: 10 transactions per block per address. Limits can be tiered by address class (e.g. faucet addresses have higher quotas).

### Node Slashing

| Condition | Slash | Jail |
|-----------|-------|------|
| UptimeScore < 20 for 3 consecutive epochs | 1% (0.5% burned, 0.5% to community pool) | Yes |
| Double-sign evidence | 5% (all burned) | Yes, tombstoned |
| Missed > 50% blocks in window | 0.1% | Yes |

Validators must run `tmkms` (Tendermint Key Management System) or equivalent HSM-backed signing to prevent double-signing.

### Multisig Governance

Emergency parameter changes use a 3-of-5 multisig admin account. The five keyholders are geographically distributed and hold hardware-backed keys (Ledger). The key ceremony procedure is documented in `docs/key-ceremony.md`.

Major protocol changes (module upgrades, tokenomics changes) require an on-chain governance proposal with a minimum deposit of 10,000 TMZ and a 7-day voting period.

---

## 6. Data Flow — Literary Work Submission to NFT Ownership

```
1. Author prepares work
   └─ Client computes SHA-256 hash of content bytes

2. Author submits MsgSubmitWork
   ├─ Ante handler: blocklist check → rate-limit check → fee deducted → 20% burned
   └─ literature keeper:
       ├─ Validates content hash format (hex, 64 chars)
       ├─ Stores Work{id, author, title, contentHash, timestamp} in KV store
       └─ Emits EventWorkSubmitted{workId, author, contentHash}

3. Accesslog records submission
   └─ accesslog keeper: writes AccessLogEntry{actor, workId, action="submit", height}

4. Author mints NFT via CosmWasm literary-nft contract
   ├─ MsgExecuteContract → literary-nft::ExecuteMsg::Mint{work_id, metadata_uri}
   ├─ Contract verifies work exists on-chain (queries literature module)
   ├─ Contract mints CW-721 token with work_id as token_id
   └─ Emits wasm event: action="mint", token_id=work_id, owner=author

5. NFT transfer (secondary sale)
   ├─ Buyer submits MsgExecuteContract → Transfer{token_id, recipient}
   ├─ Contract updates token owner in contract state
   └─ Emits wasm event: action="transfer_nft"

6. Explorer indexes all events
   └─ PostgreSQL indexer: subscribes to Tendermint WebSocket,
      writes to works, nft_tokens, access_log tables

7. Frontend displays
   └─ Next.js literary browser queries Explorer REST API
      to display work metadata, NFT owner, access history
```

---

## 7. Off-Chain Components

### Block Explorer

- **Indexer**: Node.js process subscribed to the chain's Tendermint WebSocket (`/websocket`). Parses `tx_result` events and writes to PostgreSQL.
- **API**: Express.js REST API serving `/blocks`, `/transactions`, `/works`, `/nfts`, `/validators` endpoints.
- **Frontend**: Next.js app consuming the Express API.

### WebSocket Relay Service

A thin relay that subscribes to the chain's Tendermint WS and re-broadcasts events to browser clients via Socket.IO. This decouples browser clients from direct chain connections and allows event filtering by module/type.

### TypeScript SDK (`@tamizhi/chain-sdk`)

Built on CosmJS. Provides:
- `TamizhiClient` — read-only query client (wraps `StargateClient`).
- `TamizhiSigningClient` — signing client (wraps `SigningStargateClient`) with helpers for all 9 modules' messages.
- Message factories for all custom msgs.
- Type definitions generated from protobuf.

Published to npm. Install: `npm install @tamizhi/chain-sdk`.

### Wallet App

Next.js PWA with Keplr/Leap wallet integration. Features:
- Connect wallet, view balances and staking positions.
- Send TMZ, delegate/undelegate.
- View pending and claimed rewards.
- Submit literary works.

### Literary Browser

Next.js app for browsing the on-chain literary corpus. Features:
- Browse and full-text search 53+ seeded Tamil works.
- View content hash and NFT ownership for each work.
- Submit new works (requires connected wallet).

### Monitoring Stack

- **Prometheus**: Scrapes the chain's native Cosmos SDK metrics endpoint (`/metrics` on port 26660) plus custom application metrics.
- **Alertmanager**: 14 alert rules covering block production halts, validator downtime, IBC channel freezes, high fee-burn rate anomalies, and disk exhaustion.
- **Grafana**: Dashboards for validator health, token economics, literary content growth, and IBC transfer volume.

---

## 8. Upgrade Path

### On-Chain Governance Upgrade Flow

```
1. Team prepares upgrade binary (new tamizhi version)
2. Governance proposal: MsgSoftwareUpgrade{name, height, info}
3. Voting period (7 days) — requires > 2/3 of bonded stake to vote YES
4. At upgrade height, all nodes halt with "UPGRADE NEEDED" panic
5. Cosmovisor detects the panic:
   - Looks for binary at ~/.tamizhi/cosmovisor/upgrades/<name>/bin/tamizhi
   - Swaps binary and restarts the process
6. New binary runs upgrade handler (registered in app/upgrades/):
   - Migrates store schemas if needed
   - Updates module params
   - Sets new ConsensusVersion on affected modules
7. Chain resumes producing blocks
```

### Adding an Upgrade Binary

```bash
# Build the new binary
make build

# Register it with Cosmovisor
make cosmovisor-add-upgrade UPGRADE_NAME=v1.1.0
# Places binary at ~/.tamizhi/cosmovisor/upgrades/v1.1.0/bin/tamizhi
```

### Upgrade Handler Registration

Each upgrade handler is defined in `app/upgrades/<version>/upgrade.go` and registered in `app/app.go`:

```go
app.UpgradeKeeper.SetUpgradeHandler("v1.1.0", upgrades.V110UpgradeHandler(app))
```

Handlers must be deterministic and idempotent — they run on every node at the same height.

### Emergency Patches

For consensus-breaking bugs that cannot wait for governance:
1. The 3-of-5 multisig admin submits a coordinated halt proposal.
2. All validators apply the patch binary manually.
3. Chain is restarted at the agreed halt height.
4. A post-mortem governance proposal is submitted to ratify the emergency action.
