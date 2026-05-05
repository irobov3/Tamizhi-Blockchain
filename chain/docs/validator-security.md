# Tamizhi Validator Operational Security Guide

## 1. Server Hardening

### UFW Firewall

Use `scripts/setup-validator-firewall.sh` to apply the standard ruleset. The policy is:

| Port | Protocol | Allowed From | Purpose |
|------|----------|-------------|---------|
| `$SSH_PORT` (default 2222) | TCP | Any | SSH access (non-standard port) |
| 26656 | TCP | Sentry IPs only | CometBFT P2P |
| 26657 | TCP | 127.0.0.1 only | RPC (never expose publicly) |
| 9090 | TCP | 127.0.0.1 only | gRPC |
| 26660 | TCP | Monitoring IP | Prometheus metrics scraping |

Quick apply:
```bash
# On the validator node (as root):
SENTRY_IPS="1.2.3.4,5.6.7.8" \
MONITORING_IP="10.0.1.50" \
SSH_PORT=2222 \
bash scripts/setup-validator-firewall.sh
```

For sentry nodes, the firewall is more permissive on port 26656 (accept from any peer) but still restricts RPC to localhost.

### SSH Hardening

Edit `/etc/ssh/sshd_config`:
```
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers validator-admin
```

Restart SSH: `systemctl restart sshd`

Verify you can still log in before closing the current session.

### fail2ban

Install and configure fail2ban to ban repeated SSH failures:
```bash
apt install fail2ban -y

cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled  = true
port     = 2222
maxretry = 5
bantime  = 3600
findtime = 600
EOF

systemctl enable --now fail2ban
fail2ban-client status sshd
```

### Unattended Security Upgrades

```bash
apt install unattended-upgrades -y

cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "ops@tamizhi.ai";
EOF

dpkg-reconfigure -plow unattended-upgrades
```

Set `Automatic-Reboot` to `false` — reboots on a validator require a controlled restart of the `tamizhi` service via your process manager.

### Additional OS Hardening

```bash
# Disable unused services
systemctl disable --now avahi-daemon cups bluetooth

# Kernel hardening via sysctl
cat >> /etc/sysctl.d/99-tamizhi.conf <<'EOF'
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
EOF
sysctl --system
```

---

## 2. Sentry Node Architecture

### Concept

The validator's signing key should never be reachable directly from the public internet. Sentry nodes act as a protective relay layer: they are connected to the public P2P network and forward consensus messages to/from the private validator.

### Architecture Diagram

```
                          PUBLIC INTERNET
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼──────┐  ┌──────▼─────┐  ┌──────▼─────┐
        │  Sentry 1  │  │  Sentry 2  │  │  Sentry 3  │
        │ (region A) │  │ (region B) │  │ (region C) │
        │  26656 pub │  │  26656 pub │  │  26656 pub │
        └─────┬──────┘  └──────┬─────┘  └──────┬─────┘
              │                │                │
              └────────────────┼────────────────┘
                    PRIVATE NETWORK (VPN / VPC)
                               │
                      ┌────────▼────────┐
                      │   VALIDATOR     │
                      │  (no public IP) │
                      │  26656 priv     │
                      │  tmkms :5555    │
                      └─────────────────┘
```

### Sentry Node Configuration (`config.toml`)

On each sentry node:
```toml
[p2p]
pex = true
persistent_peers = "<validator-node-id>@<validator-private-ip>:26656"
private_peer_ids = "<validator-node-id>"
addr_book_strict = false
```

### Validator Node Configuration (`config.toml`)

```toml
[p2p]
pex = false
persistent_peers = "<sentry1-id>@<sentry1-private-ip>:26656,<sentry2-id>@<sentry2-private-ip>:26656"
addr_book_strict = false

[rpc]
laddr = "tcp://127.0.0.1:26657"
```

`pex = false` on the validator prevents it from advertising itself to the gossip network. It only knows about its private sentry nodes.

---

## 3. Key Management

### Validator Consensus Key

The consensus key (`priv_validator_key.json`) is the most sensitive key on a validator. If stolen, an attacker can cause your validator to double-sign, which results in tombstoning (permanent removal from the active set) and a 5% slash on staked TMZ.

**Never** store `priv_validator_key.json` on a internet-connected host in plaintext.

### Tendermint KMS (tmkms)

[tmkms](https://github.com/iqlusioninc/tmkms) is a dedicated signing daemon that holds the validator key in a hardware security module (HSM) or YubiHSM, and exposes a signing socket to the validator node over a private network connection.

#### Installation

```bash
cargo install tmkms --features=yubihsm --locked
# or for software keys (less secure, acceptable for testnet):
cargo install tmkms --features=softsign --locked
```

#### Configuration (`tmkms.toml`)

```toml
[[chain]]
id = "tamizhi-mainnet-1"
key_format = { type = "bech32", account_key_prefix = "tamizhi", consensus_key_prefix = "tamizhivalcons" }
state_file = "/var/lib/tmkms/tamizhi-mainnet-1-state.json"

[[signing_provider.softsign]]
chain_ids = ["tamizhi-mainnet-1"]
key_format = "bech32"
path = "/var/lib/tmkms/signing.key"

[[validator]]
chain_id = "tamizhi-mainnet-1"
addr = "tcp://validator-private-ip:5555"
secret_key = "/var/lib/tmkms/kms-identity.key"
protocol_version = "v0.34"
reconnect = true
```

#### Validator node configuration

In `config.toml` on the validator:
```toml
[priv_validator]
laddr = "tcp://0.0.0.0:5555"
```

And remove `priv_validator_key.json` from the validator host entirely — tmkms holds the key.

#### tmkms systemd service

```ini
[Unit]
Description=Tendermint KMS
After=network.target

[Service]
User=tmkms
ExecStart=/usr/local/bin/tmkms start -c /etc/tmkms/tmkms.toml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### YubiHSM 2 (Recommended for Mainnet)

For mainnet validators, the signing key should reside in a YubiHSM 2 hardware module. The key never leaves the HSM. Configure tmkms with `--features=yubihsm` and provide the device connector URL and authentication key ID in `tmkms.toml`.

---

## 4. Monitoring

Refer to `monitoring/alerts/tamizhi.rules.yml` for the full Prometheus alerting ruleset. The following thresholds are active:

### Block Production

| Alert | Condition | Severity |
|-------|-----------|---------|
| `BlockProductionSlow` | No new blocks in 2 minutes (`increase(tendermint_consensus_height[2m]) < 1`) | Critical |
| `BlockTimeTooHigh` | Block interval > 8 s for 5 minutes (target is 5 s) | Warning |

### Validator Health

| Alert | Condition | Severity |
|-------|-----------|---------|
| `ValidatorMissedBlocks` | >50 missed blocks in 10 minutes | Warning |
| `PeerCountLow` | Fewer than 2 peers for 5 minutes | Warning |
| `NodeDown` | `up{job="tamizhi-chain"} == 0` for 1 minute | Critical |

### Mempool

| Alert | Condition | Severity |
|-------|-----------|---------|
| `MempoolHigh` | >500 pending txs for 5 minutes | Warning |
| `MempoolFull` | >5,000 pending txs for 1 minute (possible spam attack) | Critical |

### Tamizhi-Specific

| Alert | Condition | Severity |
|-------|-----------|---------|
| `NodesBeingJailed` | Any service nodes jailed in the last hour | Warning |
| `HighThreatFlags` | >10 active security threat flags for 5 minutes | Critical |
| `BlockedTxSpike` | Blocked tx rate >1/s for 2 minutes | Warning |

### System Resources

| Alert | Condition | Severity |
|-------|-----------|---------|
| `DiskSpaceHigh` | Disk usage >80% for 10 minutes | Warning |
| `DiskSpaceCritical` | Disk usage >90% for 5 minutes — chain may halt | Critical |
| `MemoryHigh` | <10% memory available for 5 minutes | Critical |

### Recommended Alert Routing

```yaml
# alertmanager.yml (excerpt)
route:
  group_by: ['alertname', 'severity']
  routes:
    - match:
        severity: critical
      receiver: pagerduty-critical
      repeat_interval: 15m
    - match:
        severity: warning
      receiver: slack-ops
      repeat_interval: 4h
```

Response time targets:
- **Critical**: acknowledge within 5 minutes, resolve within 30 minutes.
- **Warning**: acknowledge within 1 hour, resolve within 24 hours.

---

## 5. DDoS Protection

### Rate Limiting at the RPC Layer

The validator's RPC port (26657) must **never** be exposed to the internet. If you operate public RPC endpoints for users, place them behind a reverse proxy with rate limiting.

Nginx example:
```nginx
limit_req_zone $binary_remote_addr zone=rpc:10m rate=10r/s;

server {
    listen 443 ssl;
    server_name rpc.tamizhi.ai;

    location / {
        limit_req zone=rpc burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:26657;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Cloudflare settings (if using Cloudflare proxy):
- Enable "Under Attack Mode" during active DDoS events.
- Create a Rate Limiting rule: max 100 requests per 10 seconds per IP to `rpc.tamizhi.ai/*`.
- Enable Bot Fight Mode.

### Mempool Size Limits

In `config.toml`:
```toml
[mempool]
max_txs_bytes = 1073741824  # 1 GB
max_tx_bytes = 1048576      # 1 MB per tx
cache_size = 10000
max_batch_bytes = 10485760  # 10 MB
```

The `MempoolFull` alert fires at 5,000 transactions. If this alert fires frequently, investigate for spam. Temporarily increasing `min-gas-prices` deters low-value spam:

```toml
# app.toml
minimum-gas-prices = "5000utmz"  # raise during spam attack
```

### P2P Rate Limiting

```toml
[p2p]
recv_rate = 5120000   # 5 MB/s
send_rate = 5120000   # 5 MB/s
max_num_inbound_peers = 40
max_num_outbound_peers = 10
```

---

## 6. Double-Sign Prevention

### What Is Double-Signing?

Double-signing occurs when a validator signs two different blocks at the same height and round. This is a **Tendermint equivocation fault**, and Cosmos SDK responds by:

1. Immediately **jailing** the validator (removed from the active set).
2. **Tombstoning** the validator (permanent ban — cannot re-join without governance action).
3. **Slashing 5%** of all delegated stake (delegators also lose funds).

Unlike missing blocks (which only jail, not tombstone), a double-sign is irreversible on-chain.

### How tmkms Prevents Double-Signing

tmkms maintains a **state file** (`tamizhi-mainnet-1-state.json`) that records the last signed height and round. Before signing any block:

1. tmkms checks the requested `(height, round, step)` against the state file.
2. If the request is at or below a previously signed height, **tmkms refuses to sign**.
3. The state file is updated atomically — an OS crash cannot produce a state where tmkms is uncertain what it last signed.

This prevents the most common cause of double-signing: restarting a validator from an old backup that doesn't know about recent blocks.

### Safe Restart Procedure

Never start a second validator instance while one is already running.

```bash
# Always stop before restarting
systemctl stop tamizhi

# Verify it is stopped
pgrep tamizhi && echo "STILL RUNNING — do not start backup" || echo "Safe to start"

systemctl start tamizhi
```

If migrating to a new host:
1. Stop the old validator and wait 2 minutes for finality.
2. Copy the `priv_validator_state.json` (or let tmkms handle state).
3. Start the new validator.
4. Never run both simultaneously.

### What to Do If Tombstoned

Tombstoning is permanent — the validator key cannot re-join the active set. Recovery steps:

1. Create a new validator with a new consensus key.
2. Migrate delegators via governance signaling or direct communication.
3. The tombstoned validator's staked TMZ is released after the unbonding period (21 days).
4. Conduct a post-mortem to understand the cause.

---

## 7. Upgrade Procedures

### Cosmovisor Overview

[Cosmovisor](https://docs.cosmos.network/main/build/tooling/cosmovisor) is the standard upgrade manager for Cosmos SDK chains. It monitors the governance upgrade plan and automatically swaps the binary at the target block height.

See `docs/cosmovisor.md` for the full Cosmovisor setup guide. Key points for security:

- Always verify the SHA-256 checksum of the new binary before placing it in the upgrade directory.
- Set `DAEMON_ALLOW_DOWNLOAD_BINARIES=false` in production — download and verify manually.
- Enable `DAEMON_BACKUP_DIR` for automatic pre-upgrade state snapshots.

### Pre-Upgrade Checklist

- [ ] Read the upgrade release notes and migration guide.
- [ ] Test the upgrade on a local devnet or public testnet first.
- [ ] Verify the new binary against the published checksum:
  ```bash
  sha256sum tamizhi-v1.1.0-linux-amd64
  # Compare to https://github.com/tamizhi-ai/chain/releases/tag/v1.1.0
  ```
- [ ] Place the binary in the Cosmovisor upgrades directory:
  ```bash
  mkdir -p ~/.tamizhi/cosmovisor/upgrades/v1.1.0/bin/
  cp tamizhi-v1.1.0-linux-amd64 ~/.tamizhi/cosmovisor/upgrades/v1.1.0/bin/tamizhi
  chmod +x ~/.tamizhi/cosmovisor/upgrades/v1.1.0/bin/tamizhi
  ```
- [ ] Back up the chain data directory:
  ```bash
  cp -r ~/.tamizhi/data ~/.tamizhi/data.backup-pre-v1.1.0
  ```
- [ ] Confirm the upgrade height from the governance proposal:
  ```bash
  tamizhi query upgrade plan --node https://rpc.tamizhi.ai:443
  ```
- [ ] Alert the monitoring team of the planned upgrade window.

### Automatic Upgrade (Cosmovisor)

Cosmovisor handles the swap automatically at the governance-specified block height. Watch the logs:
```bash
journalctl -fu cosmovisor --since "5 minutes ago"
```

Expected log at upgrade height:
```
INF applying upgrade "v1.1.0" at height: 1234567
INF starting new version binary: /root/.tamizhi/cosmovisor/upgrades/v1.1.0/bin/tamizhi
```

### Rollback Plan

If the new binary fails to start or produces consensus errors immediately after upgrade:

1. **Stop Cosmovisor/tamizhi immediately.**
2. Restore the pre-upgrade data backup:
   ```bash
   systemctl stop cosmovisor
   rm -rf ~/.tamizhi/data
   cp -r ~/.tamizhi/data.backup-pre-v1.1.0 ~/.tamizhi/data
   ```
3. Roll back the binary symlink:
   ```bash
   ln -sf ~/.tamizhi/cosmovisor/genesis/bin/tamizhi ~/.tamizhi/cosmovisor/current/bin/tamizhi
   ```
4. Restart with the old binary and coordinate with other validators.
5. A chain halt at the upgrade height requires a coordinated validator restart — follow instructions from the Tamizhi core team in the `#validator-ops` channel.

### Post-Upgrade Verification

```bash
# Check the new binary version
tamizhi version

# Confirm block production resumed
tamizhi status --node http://localhost:26657 | jq '.sync_info'

# Check for any upgrade-related errors in logs
journalctl -u cosmovisor --since "30 minutes ago" | grep -i "error\|panic\|failed"
```
