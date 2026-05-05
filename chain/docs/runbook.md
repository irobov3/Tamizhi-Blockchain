# Tamizhi Chain — Incident Runbook

**Last updated:** 2026-05-04  
**Chain ID:** `tamizhi-testnet-1`  
**On-call channel:** `#tamizhi-alerts`

---

## Table of Contents

1. [Block Production Stalled](#1-block-production-stalled)
2. [Mempool Full](#2-mempool-full)
3. [Node Jailed](#3-node-jailed)
4. [Disk Space Critical](#4-disk-space-critical)
5. [Security Threat Spike](#5-security-threat-spike)
6. [Validator Double-Sign](#6-validator-double-sign)

---

## 1. Block Production Stalled

**Alert:** `BlockProductionSlow` (critical)  
**Symptom:** No new blocks for ≥ 2 minutes (`increase(tendermint_consensus_height[2m]) < 1`).

### Diagnosis checklist

```bash
# 1. Check if the node process is alive
docker compose ps validator1 validator2

# 2. Check latest block height and consensus state
curl -s http://localhost:26657/status | jq '.result.sync_info'
curl -s http://localhost:26657/consensus_state | jq '.result.round_state'

# 3. Check peer count — consensus requires 2/3 of validators online
curl -s http://localhost:26657/net_info | jq '.result.n_peers'

# 4. Check disk space (a full disk causes a halt)
df -h /

# 5. Check validator key is present and matches priv_validator_key.json
tamizhi tendermint show-validator --home /data/val1
```

### Resolution steps

**If process crashed:**
```bash
docker compose restart validator1
# Watch logs for startup errors
docker compose logs -f validator1
```

**If consensus is stuck (not enough validators online):**
- Ensure both `validator1` and `validator2` are reachable and peered.
- Check for network partition: `curl -s http://validator2:26657/status`.

**If validator key is missing or mismatched:**
```bash
# Confirm key file exists
ls /data/val1/config/priv_validator_key.json

# Never copy a key from another running node — risk of double-sign
# Restore from secure backup only
```

**Emergency restart sequence:**
```bash
docker compose stop validator1
docker compose start validator1
# Allow up to 60s for startup (healthcheck start_period)
docker compose ps validator1
```

---

## 2. Mempool Full

**Alerts:** `MempoolHigh` (warning, >500 txs) / `MempoolFull` (critical, >5000 txs)  
**Symptom:** Transactions are not being included in blocks fast enough, or a spam attack is in progress.

### Diagnosis

```bash
# Current mempool depth
curl -s http://localhost:26657/num_unconfirmed_txs | jq '.result'

# Check for spam: many txs from same address
curl -s http://localhost:26657/unconfirmed_txs?limit=100 | jq '.result.txs'

# Check block gas limit vs actual usage
curl -s http://localhost:26657/consensus_params | jq '.result.consensus_params.block'
```

### Resolution — increase mempool capacity (temporary relief)

Edit `/data/val1/config/config.toml`:

```toml
[mempool]
# Raise from default 5000 to 10000
size = 10000
# Optionally increase max bytes
max_txs_bytes = 1073741824  # 1 GB
```

Restart the node after editing:
```bash
docker compose restart validator1
```

### Resolution — add a spam address to the ante-handler blocklist

```bash
# Identify the spam address from mempool inspection
SPAM_ADDR="tamizhi1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Add to blocklist (requires governance key or admin key)
tamizhi tx security add-blocked-address $SPAM_ADDR \
  --from admin \
  --chain-id tamizhi-testnet-1 \
  --keyring-backend test \
  --yes
```

### Resolution — flush mempool (last resort)

```bash
# Restart with mempool flush flag (drops all pending txs)
tamizhi start --home /data/val1 --reset-mempool
```

---

## 3. Node Jailed

**Alert:** `NodesBeingJailed` (warning)  
**Symptom:** A service node has been jailed due to downtime or uptime score dropping below threshold.

### Check jailed node status

```bash
# List all jailed nodes
tamizhi query nodes list --status jailed --chain-id tamizhi-testnet-1

# Check uptime score for a specific node
tamizhi query nodes show <NODE_ADDRESS> --chain-id tamizhi-testnet-1
```

### Fix uptime issues

1. Ensure the service node is reachable on its advertised endpoint.
2. Check service node logs for crashes or network issues.
3. Wait for at least one full uptime-check epoch before attempting unjail.

### Unjail via MsgUnjailNode

```bash
# The node operator submits the unjail transaction
tamizhi tx nodes unjail-node \
  --from <NODE_OPERATOR_KEY> \
  --chain-id tamizhi-testnet-1 \
  --keyring-backend test \
  --gas auto \
  --gas-adjustment 1.4 \
  --fees 5000utmz \
  --yes

# Confirm node is no longer jailed
tamizhi query nodes show <NODE_ADDRESS> --chain-id tamizhi-testnet-1 | grep jailed
```

### Prevent re-jailing

- Monitor the node's uptime endpoint continuously.
- Set up a systemd/supervisor watchdog for the service process.
- Ensure the node's advertised IP/port is publicly reachable.

---

## 4. Disk Space Critical

**Alerts:** `DiskSpaceHigh` (warning, <20% free) / `DiskSpaceCritical` (critical, <10% free)  
**Symptom:** The node's data directory is growing faster than expected. If disk fills completely, the chain halts.

### Immediate: free space fast

```bash
# 1. Check what is taking space
du -sh /data/val1/data/*

# 2. Prune old block data (CometBFT block store)
# Edit config.toml to set pruning strategy:
# [storage]
# pruning = "custom"
# pruning-keep-recent = "1000"
# pruning-keep-every = "0"
# pruning-interval = "100"

# 3. Compact the state DB
tamizhi tendermint reset-state --home /data/val1
```

### State sync (fresh start without full history)

```bash
# On a new or wiped node:
# 1. Get a trusted block hash and height from a healthy peer
TRUST_HEIGHT=$(curl -s http://validator1:26657/status | jq -r '.result.sync_info.latest_block_height')
TRUST_HASH=$(curl -s http://validator1:26657/block?height=$TRUST_HEIGHT | jq -r '.result.block_id.hash')

# 2. Edit config.toml on the target node:
# [statesync]
# enable = true
# rpc_servers = "validator1:26657,validator2:26657"
# trust_height = <TRUST_HEIGHT>
# trust_hash = "<TRUST_HASH>"
# trust_period = "168h"

# 3. Wipe state (NOT the key files) and start
tamizhi tendermint unsafe-reset-all --home /data/val1 --keep-addr-book
docker compose start validator1
```

> **WARNING:** `unsafe-reset-all` removes all block and state data. Never run it on a live validator without stopping the process first. Always keep `priv_validator_key.json` backed up securely.

### Snapshot-based restore

```bash
# If a snapshot is available (e.g., from an S3 bucket or peer):
# 1. Stop the node
docker compose stop validator1

# 2. Extract snapshot into data directory
tar -xzf tamizhi-snapshot-latest.tar.gz -C /data/val1/data/

# 3. Restart
docker compose start validator1
```

---

## 5. Security Threat Spike

**Alert:** `HighThreatFlags` (critical, >10 flags) / `BlockedTxSpike` (warning)  
**Symptom:** The security module has detected and flagged anomalous activity.

### Inspect active threat flags

```bash
# List all active threat flags
tamizhi query security list-threat-flags --chain-id tamizhi-testnet-1

# Get detail on a specific flag
tamizhi query security show-threat-flag <FLAG_ID> --chain-id tamizhi-testnet-1
```

### Raise a threat flag manually (incident response)

```bash
# Example: flag a suspected attack address
tamizhi tx security raise-threat-flag \
  --address <SUSPICIOUS_ADDRESS> \
  --reason "High-volume spam attack detected" \
  --from security-admin \
  --chain-id tamizhi-testnet-1 \
  --keyring-backend test \
  --fees 5000utmz \
  --yes
```

### Resolve / clear a threat flag

```bash
# After the threat is neutralized
tamizhi tx security resolve-threat-flag \
  --flag-id <FLAG_ID> \
  --resolution "Attack mitigated; address blocklisted" \
  --from security-admin \
  --chain-id tamizhi-testnet-1 \
  --keyring-backend test \
  --fees 5000utmz \
  --yes
```

### Blocklist a malicious address

```bash
tamizhi tx security add-blocked-address <ATTACKER_ADDRESS> \
  --from security-admin \
  --chain-id tamizhi-testnet-1 \
  --keyring-backend test \
  --fees 5000utmz \
  --yes
```

### Post-incident

1. Record the incident in the `#tamizhi-security` channel with timeline and resolution.
2. Review `tamizhi_ante_blocked_tx_total` metric trend over 24h.
3. If rate persists, consider raising the ante-handler fee floor via governance:
   ```bash
   tamizhi tx gov submit-proposal param-change proposal.json --from governance-key
   ```

---

## 6. Validator Double-Sign

**Alert:** Manual detection via tombstone query or slashing event.  
**Symptom:** A validator signed two different blocks at the same height and round. This is a **critical, irreversible event** — the validator is permanently tombstoned.

### Confirm double-sign

```bash
# Check for slashing events in block results
tamizhi query slashing signing-info <VALIDATOR_CONS_PUBKEY> \
  --chain-id tamizhi-testnet-1

# Check tombstone status (tombstoned = true means the key is permanently banned)
tamizhi query slashing signing-info $(tamizhi tendermint show-validator --home /data/val1) \
  --chain-id tamizhi-testnet-1 | grep tombstoned
```

### Consequences

- The validator's stake is slashed (default: 5% for double-sign).
- The validator's consensus key is **permanently tombstoned** — it can never re-join consensus with this key.
- Delegators on the validator also lose a proportional share of stake.

### Emergency key rotation

Because a tombstoned key cannot be recovered, you must register a **new validator** with a fresh consensus key:

```bash
# 1. STOP the compromised validator immediately to prevent further signing
docker compose stop validator1

# 2. Generate a new consensus key on a secure, air-gapped machine
# Never generate the new key on the compromised host

# 3. Create a new validator with the new key
tamizhi tx staking create-validator \
  --amount 250000000000000utmz \
  --pubkey $(tamizhi tendermint show-validator --home /data/val1-new) \
  --moniker "tamizhi-validator1-new" \
  --chain-id tamizhi-testnet-1 \
  --commission-rate 0.05 \
  --commission-max-rate 0.20 \
  --commission-max-change-rate 0.01 \
  --min-self-delegation 1 \
  --from new-validator-key \
  --keyring-backend test \
  --fees 10000utmz \
  --yes

# 4. Re-delegate any remaining stake from the tombstoned validator
tamizhi tx staking redelegate \
  <OLD_VALIDATOR_ADDR> <NEW_VALIDATOR_ADDR> \
  <AMOUNT>utmz \
  --from delegator-key \
  --chain-id tamizhi-testnet-1 \
  --keyring-backend test \
  --fees 5000utmz \
  --yes
```

### Root cause investigation

- Review node logs for the time window of the double-sign: look for duplicate signing attempts.
- Common causes:
  - Running two instances of the validator with the same key (e.g., failover misconfiguration).
  - Key material copied to a second host.
  - Corrupted consensus state causing replay of an old vote.
- **Prevention:** Use a remote signer (Horcrux or TMKMS) that enforces single-instance signing and maintains a sign-state file.

---

## Quick Reference

| Alert | Severity | First Action |
|---|---|---|
| `BlockProductionSlow` | Critical | Check peers, disk, process status |
| `BlockTimeTooHigh` | Warning | Check peer count and CPU load |
| `ValidatorMissedBlocks` | Warning | Check validator process and key |
| `PeerCountLow` | Warning | Check seed node, firewall rules |
| `MempoolFull` | Critical | Check for spam, raise mempool size |
| `NodesBeingJailed` | Warning | Check node uptime, submit unjail tx |
| `HighThreatFlags` | Critical | Query flags, raise/resolve via security tx |
| `BlockedTxSpike` | Warning | Review blocklist, check for attack |
| `DiskSpaceCritical` | Critical | Prune data, consider state sync |
| `MemoryHigh` | Critical | Restart node, check for memory leaks |
| `NodeDown` | Critical | Restart container, check logs |
