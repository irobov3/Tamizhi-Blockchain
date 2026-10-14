# Tamizhi Testnet-1 Genesis

**Chain ID**: `tamizhi-testnet-1`  
**Genesis Time**: `2026-06-01T00:00:00Z`  
**Binary**: `tamizhi`  
**Go Version**: 1.21+  
**Cosmos SDK**: v0.50.9

---

## Chain Parameters

### Authentication (`auth`)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `max_memo_characters` | 256 | Sufficient for human-readable memos without bloating tx size |
| `tx_sig_limit` | 7 | Allows multisig with up to 7 signers (covers most multisig setups) |
| `tx_size_cost_per_byte` | 10 | Standard Cosmos SDK default |
| `sig_verify_cost_ed25519` | 590 | Standard cost for Ed25519 signature verification |
| `sig_verify_cost_secp256k1` | 1000 | Standard cost for secp256k1 (EVM-compatible) verification |

### Bank (`bank`)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `default_send_enabled` | `true` | Sending enabled by default for all denoms |
| `supply` | 1,000,000,000,000,000 utmz | 1 billion TMZ total supply at genesis |

### Staking (`staking`)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `unbonding_time` | 21 days (1,814,400s) | Standard security window; long enough to detect equivocation |
| `max_validators` | 100 | Sufficient for testnet; balances decentralization with performance |
| `max_entries` | 7 | Max concurrent unbonding/redelegation entries per pair |
| `historical_entries` | 10,000 | Enables IBC light client verification for 10,000 blocks back |
| `bond_denom` | `utmz` | Native staking token (micro-Tamizhi) |
| `min_commission_rate` | 5% | Prevents a race-to-zero on validator commissions |

### Governance (`gov`)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `min_deposit` | 10 TMZ (10,000,000 utmz) | Low barrier for testnet experimentation |
| `max_deposit_period` | 48 hours (172,800s) | Quick iteration for testnet proposals |
| `voting_period` | 48 hours (172,800s) | Fast governance cycles on testnet |
| `quorum` | 33.4% | Minimum participation for a valid vote |
| `threshold` | 50% | Simple majority passes proposals |
| `veto_threshold` | 33.4% | Strong minority veto prevents governance attacks |
| `min_initial_deposit_ratio` | 20% | Requires 2 TMZ to submit a proposal; discourages spam |
| `expedited_voting_period` | 24 hours (86,400s) | Emergency proposals conclude in one day |
| `expedited_threshold` | 66.7% | Supermajority required for expedited proposals |
| `burn_vote_veto` | `true` | Deposit burned if proposal is vetoed; discourages malicious proposals |

### Minting (`mint`)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `mint_denom` | `utmz` | Inflation paid in native token |
| `inflation_rate_change` | 13% | Annual adjustment rate toward target |
| `inflation_max` | 20% | Cap to prevent runaway inflation when bonding is low |
| `inflation_min` | 7% | Floor maintains staking incentive even when bonding is high |
| `goal_bonded` | 67% | Target bonded ratio; inflation adjusts to maintain this |
| `blocks_per_year` | 6,311,520 | Based on ~5 second average block time |

### Slashing (`slashing`)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `signed_blocks_window` | 100 | Short window suitable for testnet; easier to test liveness rules |
| `min_signed_per_window` | 50% | Validators must sign 50 of last 100 blocks |
| `downtime_jail_duration` | 600s (10 min) | Short jail time for testnet to allow quick recovery |
| `slash_fraction_double_sign` | 5% | Standard penalty for equivocation |
| `slash_fraction_downtime` | 0.01% | Small penalty for downtime; emphasizes jailing over slashing |

### Crisis (`crisis`)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `constant_fee` | 1,000 TMZ (1,000,000,000 utmz) | High fee discourages frivolous invariant breaks |

### CosmWasm (`wasm`)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `code_upload_access` | `Everybody` | Permissionless deployment on testnet for developer onboarding |
| `instantiate_default_permission` | `Everybody` | Any code can be instantiated freely on testnet |
| `max_wasm_code_size` | 800 KB (819,200 bytes) | Accommodates large contracts while preventing abuse |

---

## Token Supply Breakdown

**Total Supply**: 1,000,000,000 TMZ (1 billion)

| Allocation | Percentage | Amount (TMZ) | Amount (utmz) | Address (Placeholder) | Notes |
|------------|-----------|--------------|----------------|----------------------|-------|
| Community Pool | 40% | 400,000,000 | 400,000,000,000,000 | `tamizhi1qypq38vgspktyxekxpj4a5p2pzwnee5mzk3xv` | Governed by on-chain proposals; funds ecosystem development, grants, and public goods |
| Core Team | 25% | 250,000,000 | 250,000,000,000,000 | `tamizhi1s77x8mvhzlqczsmwcpe4m6d7fk6c4nuhx2e9r` | 4-year linear vest, 1-year cliff. Uses `ContinuousVestingAccount` starting at genesis |
| Ecosystem Grants | 20% | 200,000,000 | 200,000,000,000,000 | `tamizhi1jv65s3grqf6v6jl3dp4t6c9t9rk99cd8z2l9p` | Distributed via governance proposals to projects building on Tamizhi |
| Public Sale | 10% | 100,000,000 | 100,000,000,000,000 | `tamizhi1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3prylxh` | Proceeds fund operating costs and exchange listings |
| Initial Validators | 5% | 50,000,000 | 50,000,000,000,000 | `tamizhi1tygms3xhhs3yv487phx3dw4a95jn7t7lpm470s` | Distributed to genesis validators; covers self-delegation and early rewards |

### Vesting Schedule (Core Team)

- **Start**: 2026-06-01T00:00:00Z (genesis)
- **Cliff**: 2027-06-01 — no tokens released before this date
- **Full Vest**: 2030-06-01 — all tokens linearly unlocked over 4 years
- **Implementation**: `ContinuousVestingAccount` with 1-year cliff enforced by setting `start_time` to cliff date (2027-06-01 = Unix 1875398400)

---

## Validator Requirements

### Minimum Self-Delegation

Validators must self-delegate a minimum of **15,000 TMZ (15,000,000,000 utmz)** per node.

This threshold:
- Ensures validators have real economic skin-in-the-game
- Filters out low-commitment participants during testnet
- Aligns with production-readiness expectations before mainnet

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 vCPU (x86_64) | 8 vCPU |
| RAM | 16 GB | 32 GB |
| Storage | 500 GB NVMe SSD | 1 TB NVMe SSD |
| Network | 1 Gbps | 1 Gbps dedicated |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Software Requirements

- Go 1.21+
- `tamizhi` binary (see Installation below)
- `cosmovisor` (recommended for upgrades)

---

## How to Join as a Validator

### 1. Install the Binary

```bash
# Clone the repository
git clone https://github.com/TamizhiAI/tamilchain.git
cd tamilchain

# Build the binary
make install

# Verify
tamizhi version --long
```

### 2. Initialize Your Node

```bash
tamizhi init <your-moniker> --chain-id tamizhi-testnet-1
```

### 3. Download the Genesis File

```bash
cp /path/to/this/genesis.json ~/.tamizhi/config/genesis.json

# Verify genesis hash
sha256sum ~/.tamizhi/config/genesis.json
```

### 4. Configure Peers and Seeds

Edit `~/.tamizhi/config/config.toml`:

```toml
[p2p]
seeds = "SEED_NODE_ID@seed1.testnet.tamizhi.ai:26656,SEED_NODE_ID@seed2.testnet.tamizhi.ai:26656"
persistent_peers = "PEER_NODE_ID@peer1.testnet.tamizhi.ai:26656"
```

### 5. Configure app.toml

```toml
minimum-gas-prices = "1000utmz"

[api]
enable = true
swagger = true
address = "tcp://0.0.0.0:1317"

[grpc]
enable = true
address = "0.0.0.0:9090"
```

### 6. Obtain Testnet Tokens

Request tokens from the faucet (see Faucet Information below). You need at least 15,000,000,000 utmz (15,000 TMZ) for the minimum self-delegation.

### 7a. Genesis Validators — Submit gentx

If you are joining at genesis (before 2026-06-01):

```bash
# Create or import your validator key
tamizhi keys add <validator-key-name>

# Submit your gentx
tamizhi genesis gentx <validator-key-name> 15000000000utmz \
  --chain-id tamizhi-testnet-1 \
  --moniker "<your-moniker>" \
  --commission-rate "0.10" \
  --commission-max-rate "0.20" \
  --commission-max-change-rate "0.01" \
  --min-self-delegation "15000000000" \
  --home ~/.tamizhi

# Submit the gentx file to the genesis coordinator:
# gentx file is at: ~/.tamizhi/config/gentx/
```

### 7b. Post-Genesis Validators — Create Validator Tx

After the chain is running:

```bash
tamizhi tx staking create-validator \
  --amount 15000000000utmz \
  --pubkey $(tamizhi tendermint show-validator) \
  --moniker "<your-moniker>" \
  --chain-id tamizhi-testnet-1 \
  --commission-rate "0.10" \
  --commission-max-rate "0.20" \
  --commission-max-change-rate "0.01" \
  --min-self-delegation "15000000000" \
  --gas auto \
  --gas-adjustment 1.4 \
  --fees 2000000utmz \
  --from <validator-key-name>
```

### 8. Start Your Node

```bash
tamizhi start --home ~/.tamizhi
```

See `validator-guide.md` for the full systemd service setup.

---

## Faucet Information

The testnet faucet provides tokens for development and validator setup.

**Faucet Endpoint**: `https://faucet.testnet.tamizhi.ai`

**Web UI**: `https://faucet.testnet.tamizhi.ai/ui`

**REST API**:
```bash
curl -X POST https://faucet.testnet.tamizhi.ai/credit \
  -H "Content-Type: application/json" \
  -d '{"address": "tamizhi1youraddresshere", "denom": "utmz"}'
```

**Discord Faucet Bot** (in `#testnet-faucet` channel):
```
$request tamizhi1youraddresshere
```

**Limits**:
- 100 TMZ (100,000,000 utmz) per request
- 1 request per address per 24 hours
- 1 request per IP per 6 hours

**Explorer**: `https://explorer.testnet.tamizhi.ai`

---

## Testnet Endpoints

| Service | URL |
|---------|-----|
| RPC | `https://rpc.testnet.tamizhi.ai` |
| REST API | `https://api.testnet.tamizhi.ai` |
| gRPC | `grpc.testnet.tamizhi.ai:9090` |
| Explorer | `https://explorer.testnet.tamizhi.ai` |
| Faucet | `https://faucet.testnet.tamizhi.ai` |

---

## Contact

- **Discord**: https://discord.gg/tamizhi
- **Telegram**: https://t.me/TamizhiAI
- **GitHub**: https://github.com/TamizhiAI/tamilchain
- **Email**: validators@tamizhi.ai
