# Tamizhi Testnet-1 — Validator Guide

**Chain ID**: `tamizhi-testnet-1`  
**Genesis Time**: `2026-06-01T00:00:00Z`  
**Min Self-Delegation**: 15,000 TMZ (15,000,000,000 utmz)

This guide walks you through every step to become a validator on Tamizhi Testnet-1, from bare-metal server setup through monitoring in production.

---

## Table of Contents

1. [Hardware Requirements](#1-hardware-requirements)
2. [Install the Binary](#2-install-the-binary)
3. [Initialize the Node](#3-initialize-the-node)
4. [Configure config.toml](#4-configure-configtoml)
5. [Configure app.toml](#5-configure-apptoml)
6. [Create or Import Your Validator Key](#6-create-or-import-your-validator-key)
7. [Get Testnet Tokens from the Faucet](#7-get-testnet-tokens-from-the-faucet)
8. [Submit Your Validator Transaction](#8-submit-your-validator-transaction)
9. [Start the Node (systemd)](#9-start-the-node-systemd)
10. [Monitor with tamizhi status and Prometheus](#10-monitor-with-tamizhi-status-and-prometheus)

---

## 1. Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 vCPU, x86_64 | 8 vCPU, x86_64 |
| RAM | 16 GB | 32 GB |
| Storage | 500 GB NVMe SSD | 1 TB NVMe SSD |
| Network | 1 Gbps | 1 Gbps dedicated |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Uptime | 99.5%+ | 99.9%+ |

**Storage notes**: Chain state grows roughly 10–30 GB per month under normal load. Size accordingly.  
**Network notes**: Ensure ports `26656` (P2P), `26657` (RPC), `1317` (REST), and `9090` (gRPC) are accessible. Lock down RPC/gRPC with firewall rules if not exposing publicly.

---

## 2. Install the Binary

### Option A — Build from Source (Recommended)

```bash
# Install system dependencies
sudo apt-get update && sudo apt-get install -y \
  build-essential git curl jq

# Install Go 1.21+
GO_VERSION="1.21.13"
curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o go.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go.tar.gz
rm go.tar.gz

# Add Go to PATH (add to ~/.bashrc or ~/.profile for persistence)
export PATH="/usr/local/go/bin:$HOME/go/bin:$PATH"

# Verify Go installation
go version  # should print go1.21.x

# Clone and build
git clone https://github.com/TamizhiAI/tamilchain.git
cd tamilchain
git checkout v1.0.0-testnet  # use the latest tagged testnet release
make install

# Verify the binary
tamizhi version --long
```

### Option B — Download Pre-built Binary

```bash
TAMIZHI_VERSION="v1.0.0-testnet"
ARCH="linux-amd64"

curl -fsSL \
  "https://github.com/TamizhiAI/tamilchain/releases/download/${TAMIZHI_VERSION}/tamizhi-${ARCH}" \
  -o /usr/local/bin/tamizhi

chmod +x /usr/local/bin/tamizhi
tamizhi version --long
```

### Install Cosmovisor (Recommended for Upgrades)

```bash
go install cosmossdk.io/tools/cosmovisor/cmd/cosmovisor@latest

# Set up directory structure
export DAEMON_NAME=tamizhi
export DAEMON_HOME=$HOME/.tamizhi
mkdir -p "$DAEMON_HOME/cosmovisor/genesis/bin"
cp $(which tamizhi) "$DAEMON_HOME/cosmovisor/genesis/bin/"
```

---

## 3. Initialize the Node

```bash
# Set your moniker (publicly visible validator name)
MONIKER="my-validator"
CHAIN_ID="tamizhi-testnet-1"

tamizhi init "$MONIKER" --chain-id "$CHAIN_ID"

# Download the genesis file
curl -fsSL \
  "https://raw.githubusercontent.com/TamizhiAI/tamilchain/main/genesis/testnet-1/genesis.json" \
  -o "$HOME/.tamizhi/config/genesis.json"

# Verify the genesis hash (compare against the published hash)
sha256sum "$HOME/.tamizhi/config/genesis.json"
```

Expected directory structure after init:

```
~/.tamizhi/
├── config/
│   ├── app.toml
│   ├── client.toml
│   ├── config.toml
│   └── genesis.json
└── data/
```

---

## State Sync (Recommended for new validators)

Instead of syncing from genesis (which takes hours), use state sync:

```bash
# 1. Initialize the node
tamizhi init myvalidator --chain-id tamizhi-testnet-1

# 2. Download genesis
curl -s https://raw.githubusercontent.com/tamizhi/chain/main/genesis/testnet-1/genesis.json > ~/.tamizhi/config/genesis.json

# 3. Configure state sync (auto-fetches trusted hash)
./scripts/configure-statesync.sh ~/.tamizhi \
    "http://rpc1.testnet.tamizhi.ai:26657,http://rpc2.testnet.tamizhi.ai:26657"

# 4. Start the node
tamizhi start
```

---

## 4. Configure config.toml

Edit `~/.tamizhi/config/config.toml`. Key settings:

```toml
#######################################################################
# P2P settings
#######################################################################
[p2p]

# Your node's external address. Replace with your public IP.
external_address = "tcp://YOUR_PUBLIC_IP:26656"

# Seed nodes — used to discover peers at startup
seeds = "SEED1_NODE_ID@seed1.testnet.tamizhi.ai:26656,SEED2_NODE_ID@seed2.testnet.tamizhi.ai:26656"

# Persistent peers — always maintain connections to these nodes
persistent_peers = "PEER1_NODE_ID@peer1.testnet.tamizhi.ai:26656"

# Maximum inbound/outbound peers
max_num_inbound_peers = 40
max_num_outbound_peers = 20

# Enable PEX (peer exchange) so the node learns about more peers
pex = true

#######################################################################
# RPC settings
#######################################################################
[rpc]

# Restrict RPC to localhost unless you intend to expose it publicly
laddr = "tcp://127.0.0.1:26657"

# Increase limits for high-traffic nodes
max_open_connections = 1000

#######################################################################
# Consensus settings
#######################################################################
[consensus]

# Timeouts tuned for ~5s block times
timeout_propose          = "3s"
timeout_propose_delta    = "500ms"
timeout_prevote          = "1s"
timeout_prevote_delta    = "500ms"
timeout_precommit        = "1s"
timeout_precommit_delta  = "500ms"
timeout_commit           = "5s"

#######################################################################
# Mempool
#######################################################################
[mempool]

# Maximum number of transactions in the mempool
size = 5000

# Maximum transaction size (bytes)
max_tx_bytes = 1048576  # 1 MB

#######################################################################
# Instrumentation (Prometheus)
#######################################################################
[instrumentation]

prometheus           = true
prometheus_listen_addr = ":26660"
namespace            = "tamizhi"
```

**Finding seed/peer IDs**: Check the `#testnet-peers` channel in the Tamizhi Discord, or query the chain team's published peer list at `https://github.com/TamizhiAI/tamilchain/tree/main/genesis/testnet-1`.

---

## 5. Configure app.toml

Edit `~/.tamizhi/config/app.toml`:

```toml
#######################################################################
# Base configuration
#######################################################################

# Minimum gas price — nodes will reject txs with lower gas price.
# 1000 utmz = 0.001 TMZ per unit of gas (recommended for testnet).
minimum-gas-prices = "1000utmz"

# Pruning strategy: "default" keeps last 100 states + every 10,000th.
# Use "nothing" if running an archive node.
pruning = "default"
pruning-keep-recent = "100"
pruning-interval    = "17"

# Halt height — set to 0 to run indefinitely.
halt-height = 0

#######################################################################
# Telemetry
#######################################################################
[telemetry]

enabled             = true
prometheus-retention-time = 60

#######################################################################
# API (REST server)
#######################################################################
[api]

# Enable the REST API server
enable  = true
swagger = true

# Bind address — use 0.0.0.0 if you want external access; otherwise 127.0.0.1.
address = "tcp://0.0.0.0:1317"

max-open-connections = 1000

#######################################################################
# gRPC
#######################################################################
[grpc]

enable  = true
address = "0.0.0.0:9090"

[grpc-web]
enable  = true
address = "0.0.0.0:9091"

#######################################################################
# State sync (for fast catch-up — not needed if syncing from genesis)
#######################################################################
[state-sync]

snapshot-interval   = 2000
snapshot-keep-recent = 2

#######################################################################
# CosmWasm
#######################################################################
[wasm]

# Maximum gas allowed for a query — set higher for complex contracts.
query-gas-limit = 3000000

# Memory cache in MiB — increase on nodes with ample RAM.
memory-cache-size = 512

simulation-gas-limit = -1
```

---

## 6. Create or Import Your Validator Key

### Option A — Create a New Key

```bash
tamizhi keys add validator --keyring-backend os

# IMPORTANT: Back up the mnemonic phrase shown after key creation.
# There is no recovery without it.

# Show your operator address (tamizhi1...)
tamizhi keys show validator -a

# Show your consensus public key (for gentx / create-validator)
tamizhi tendermint show-validator
```

### Option B — Import an Existing Key via Mnemonic

```bash
tamizhi keys add validator --recover --keyring-backend os
# You will be prompted for your 24-word BIP-39 mnemonic.
```

### Option C — Import from a Hardware Wallet (Ledger)

```bash
tamizhi keys add validator --ledger --keyring-backend os
```

### Key Security Recommendations

- Use `--keyring-backend os` (OS keychain) or `file` on headless servers; avoid `test` in production.
- Store your mnemonic in a hardware security module or offline cold storage.
- Separate your **hot wallet** (operator key, on the validator machine) from your **cold wallet** (used for governance and large transfers).
- Consider using a separate key for voting vs. signing blocks.

---

## 7. Get Testnet Tokens from the Faucet

You need at least **15,000 TMZ** (15,000,000,000 utmz) to self-delegate.

**Web faucet** (easiest):

```
https://faucet.testnet.tamizhi.ai
```

**REST API**:

```bash
VALIDATOR_ADDR=$(tamizhi keys show validator -a --keyring-backend os)

curl -X POST https://faucet.testnet.tamizhi.ai/credit \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$VALIDATOR_ADDR\", \"denom\": \"utmz\"}"
```

**Discord bot** (in `#testnet-faucet`):

```
$request tamizhi1youraddresshere
```

The faucet dispenses 100 TMZ per request (once per 24 hours). You may need multiple requests to reach the minimum. Reach out in `#validators` if you need a larger allocation.

**Verify your balance**:

```bash
tamizhi query bank balances $(tamizhi keys show validator -a --keyring-backend os) \
  --node https://rpc.testnet.tamizhi.ai
```

---

## 8. Submit Your Validator Transaction

### 8a. Genesis Validator (submit gentx before genesis time)

If you are joining before `2026-06-01T00:00:00Z`, submit a gentx to the genesis coordinator:

```bash
CHAIN_ID="tamizhi-testnet-1"

tamizhi genesis gentx validator 15000000000utmz \
  --chain-id "$CHAIN_ID" \
  --moniker "my-validator" \
  --website "https://myvalidator.example.com" \
  --identity "KEYBASE_FINGERPRINT" \
  --details "Validator for Tamizhi Testnet-1" \
  --commission-rate "0.10" \
  --commission-max-rate "0.20" \
  --commission-max-change-rate "0.01" \
  --min-self-delegation "15000000000" \
  --keyring-backend os

# Your gentx JSON is now at: ~/.tamizhi/config/gentx/
ls ~/.tamizhi/config/gentx/

# Submit the gentx file by opening a PR to the genesis repo:
# https://github.com/TamizhiAI/tamilchain/tree/main/genesis/testnet-1/gentxs
# or send it directly to the genesis coordinator via Discord.
```

### 8b. Post-Genesis Validator (create-validator tx)

If joining after the chain has launched, wait for your node to fully sync, then:

```bash
CHAIN_ID="tamizhi-testnet-1"
RPC="https://rpc.testnet.tamizhi.ai"

# Get your consensus public key
PUBKEY=$(tamizhi tendermint show-validator)

tamizhi tx staking create-validator \
  --amount 15000000000utmz \
  --pubkey "$PUBKEY" \
  --moniker "my-validator" \
  --website "https://myvalidator.example.com" \
  --identity "KEYBASE_FINGERPRINT" \
  --details "Validator for Tamizhi Testnet-1" \
  --chain-id "$CHAIN_ID" \
  --commission-rate "0.10" \
  --commission-max-rate "0.20" \
  --commission-max-change-rate "0.01" \
  --min-self-delegation "15000000000" \
  --gas auto \
  --gas-adjustment 1.4 \
  --fees 2000000utmz \
  --node "$RPC" \
  --keyring-backend os \
  --from validator

# Confirm you appear in the validator set:
tamizhi query staking validators --node "$RPC" | grep "my-validator"
```

### Commission Guidelines

| Parameter | Minimum | Recommended |
|-----------|---------|-------------|
| `commission-rate` | 5% | 5–10% |
| `commission-max-rate` | — | 20% |
| `commission-max-change-rate` | — | 1% per day |

---

## 9. Start the Node (systemd)

### 9a. Direct binary (simple setup)

Create `/etc/systemd/system/tamizhi.service`:

```ini
[Unit]
Description=Tamizhi Testnet-1 Node
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=tamizhi
Group=tamizhi
ExecStart=/usr/local/bin/tamizhi start \
  --home /home/tamizhi/.tamizhi \
  --log-format json \
  --log-level info
Restart=on-failure
RestartSec=5
LimitNOFILE=65535
LimitNPROC=65535

# Security hardening
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/home/tamizhi/.tamizhi
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
# Create the tamizhi system user if it doesn't exist
sudo useradd -m -s /bin/bash tamizhi

# Move your node home to the tamizhi user if needed
sudo mv ~/.tamizhi /home/tamizhi/.tamizhi
sudo chown -R tamizhi:tamizhi /home/tamizhi/.tamizhi

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable tamizhi
sudo systemctl start tamizhi

# Follow logs
sudo journalctl -u tamizhi -f --output cat
```

### 9b. With Cosmovisor (recommended for automatic upgrades)

Create `/etc/systemd/system/tamizhi.service`:

```ini
[Unit]
Description=Tamizhi Testnet-1 Node (cosmovisor)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=tamizhi
Group=tamizhi

Environment=DAEMON_NAME=tamizhi
Environment=DAEMON_HOME=/home/tamizhi/.tamizhi
Environment=DAEMON_ALLOW_DOWNLOAD_BINARIES=true
Environment=DAEMON_RESTART_AFTER_UPGRADE=true
Environment=DAEMON_LOG_BUFFER_SIZE=512
Environment=UNSAFE_SKIP_BACKUP=false

ExecStart=/home/tamizhi/go/bin/cosmovisor run start \
  --home /home/tamizhi/.tamizhi \
  --log-format json \
  --log-level info

Restart=on-failure
RestartSec=5
LimitNOFILE=65535
LimitNPROC=65535

PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/home/tamizhi/.tamizhi
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable tamizhi
sudo systemctl start tamizhi
sudo journalctl -u tamizhi -f --output cat
```

### Verify the Node is Running

```bash
# Check sync status
tamizhi status --node tcp://localhost:26657 | jq '.sync_info'

# You should see catching_up: false once synced
# latest_block_height should match the explorer
```

---

## 10. Monitor with tamizhi status and Prometheus

### Basic Status Checks

```bash
# Node status and sync info
tamizhi status --node tcp://localhost:26657

# Validator signing info (replace with your validator address)
VALOPER=$(tamizhi keys show validator --bech val -a --keyring-backend os)
tamizhi query slashing signing-info "$VALOPER" \
  --node tcp://localhost:26657

# Check your validator's current voting power
tamizhi query staking validator "$VALOPER" \
  --node tcp://localhost:26657 | jq '.tokens, .status'

# Query current block height
tamizhi query block --node tcp://localhost:26657 | jq '.block.header.height'
```

### Prometheus Metrics

With `prometheus = true` in `config.toml`, metrics are exposed at:

```
http://YOUR_NODE_IP:26660/metrics
```

Key metrics to track:

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `tamizhi_consensus_height` | Current block height | Stale for > 60s |
| `tamizhi_consensus_rounds` | Consensus rounds per block | Consistently > 1 |
| `tamizhi_p2p_peers` | Connected peers | < 5 |
| `tamizhi_consensus_missing_validators` | Validators not signing | > 20% of set |
| `tamizhi_mempool_size` | Transactions in mempool | > 5000 |
| `process_open_fds` | Open file descriptors | > 50,000 |

### Prometheus Scrape Configuration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: tamizhi_node
    static_configs:
      - targets: ['localhost:26660']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'tamizhi-validator-1'
```

### Grafana Dashboard

A pre-built Grafana dashboard for Cosmos SDK nodes is available at:
- **Dashboard ID**: `11036` (Cosmos Validator Monitoring)
- Import via Grafana UI → Dashboards → Import → enter ID

Metrics to add to your dashboard:
- Block height and catching-up status
- Missed blocks / signing rate
- Peer count over time
- Memory and CPU usage (via node_exporter)
- Disk I/O

### Recommended Alerting Rules (Alertmanager)

```yaml
groups:
  - name: tamizhi_validator
    rules:
      - alert: NodeNotSyncing
        expr: increase(tamizhi_consensus_height[5m]) == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Tamizhi node is not producing new blocks"

      - alert: LowPeerCount
        expr: tamizhi_p2p_peers < 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node has fewer than 5 peers"

      - alert: MissedBlocksHigh
        expr: increase(tamizhi_consensus_validator_missed_blocks[1h]) > 10
        labels:
          severity: warning
        annotations:
          summary: "Validator missed more than 10 blocks in the past hour"
```

### Key Management Hygiene — Preventing Double-Signing

Double-signing results in a **5% slash** and **permanent jailing**. Follow these practices:

1. **Never run two validator instances with the same key simultaneously** — even briefly.
2. **Use tmkms (Tendermint Key Management System)** for hardware-backed signing:
   ```bash
   # Install tmkms
   cargo install tmkms --features=softsign
   tmkms init ~/.tmkms/tamizhi
   ```
3. Before restarting or migrating a node, ensure the previous instance has fully stopped:
   ```bash
   sudo systemctl stop tamizhi
   # Wait 30+ seconds, then verify the process is gone
   pgrep tamizhi || echo "Safe to proceed"
   ```

---

## Quick Reference

```bash
# Start node
sudo systemctl start tamizhi

# Stop node
sudo systemctl stop tamizhi

# View logs
sudo journalctl -u tamizhi -f --output cat

# Check sync status
tamizhi status | jq '.sync_info.catching_up'

# Current block height
tamizhi status | jq '.sync_info.latest_block_height'

# Your validator's jailed status
tamizhi query staking validator $(tamizhi keys show validator --bech val -a) | jq '.jailed'

# Unjail (if jailed for downtime)
tamizhi tx slashing unjail \
  --from validator \
  --chain-id tamizhi-testnet-1 \
  --fees 2000000utmz \
  --node https://rpc.testnet.tamizhi.ai
```

---

## Useful Links

| Resource | URL |
|----------|-----|
| Explorer | https://explorer.testnet.tamizhi.ai |
| Faucet | https://faucet.testnet.tamizhi.ai |
| RPC | https://rpc.testnet.tamizhi.ai |
| REST API | https://api.testnet.tamizhi.ai |
| Discord | https://discord.gg/tamizhi |
| GitHub | https://github.com/TamizhiAI/tamilchain |
| Docs | https://docs.tamizhi.ai |
