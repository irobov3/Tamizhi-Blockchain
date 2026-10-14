# Cosmovisor — Zero-Downtime Upgrades for Tamizhi

## What is Cosmovisor and Why We Use It

Cosmovisor is a process supervisor for Cosmos SDK-based chains. It wraps the chain binary and monitors the upgrade-info file that the node writes when an on-chain software-upgrade governance proposal reaches its target block height. When the trigger fires, Cosmovisor:

1. Stops the running binary gracefully.
2. Backs up the data directory (unless `UNSAFE_SKIP_BACKUP=true`).
3. Swaps in the pre-placed upgrade binary.
4. Restarts the node automatically.

This eliminates the need for manual intervention during planned upgrades, reducing the risk of human error and minimising downtime to the few seconds it takes to swap binaries.

---

## Installation

Install Cosmovisor into your Go binary path:

```bash
make install-cosmovisor
```

Verify:

```bash
cosmovisor version
```

---

## Initial Setup

After building the chain binary, initialise the Cosmovisor directory structure:

```bash
make cosmovisor-init
```

This creates:

```
~/.tamizhi/cosmovisor/
├── genesis/
│   └── bin/
│       └── tamizhi        ← current (genesis) binary
└── upgrades/              ← populated before each named upgrade
```

---

## Starting the Node

### Via Make

```bash
make cosmovisor-start
```

To use a custom chain home directory:

```bash
CHAIN_HOME=/data/tamizhi make cosmovisor-start
```

### Via environment file

```bash
source scripts/cosmovisor-env.sh
cosmovisor run start
```

The environment file (`scripts/cosmovisor-env.sh`) exports all required `DAEMON_*` variables. Edit it to change poll intervals, backup behaviour, or the metrics address before sourcing.

### Localnet (validator 1)

```bash
make cosmovisor-localnet
```

---

## Performing an Upgrade

### Full upgrade workflow

1. **Develop and build the new binary** for the target upgrade name (e.g. `v1.1.0`):

   ```bash
   git checkout <release-branch>
   make build
   ```

2. **Register the upgrade binary with Cosmovisor** on every validator node:

   ```bash
   make cosmovisor-add-upgrade UPGRADE_NAME=v1.1.0
   ```

   This copies `./build/tamizhi` to:
   `~/.tamizhi/cosmovisor/upgrades/v1.1.0/bin/tamizhi`

   Alternatively, use the helper script which does both steps and optionally submits the proposal:

   ```bash
   ./scripts/prepare-upgrade.sh v1.1.0 500000 --submit-proposal
   ```

3. **Submit the governance proposal** (if not done by the script above):

   ```bash
   tamizhi tx gov submit-proposal \
     --type software-upgrade \
     --title "Upgrade to v1.1.0" \
     --description "Node slashing parameters and identity hardening" \
     --upgrade-name "v1.1.0" \
     --upgrade-height 500000 \
     --deposit 10000000utmz \
     --from validator \
     --chain-id tamizhi-1 \
     --yes
   ```

4. **Vote on the proposal**:

   ```bash
   tamizhi tx gov vote <proposal-id> yes \
     --from validator \
     --chain-id tamizhi-1
   ```

5. **Wait for the upgrade height.** Cosmovisor monitors the node and will automatically:
   - Detect the upgrade plan written to `upgrade-info.json`.
   - Back up the data directory.
   - Swap the binary.
   - Restart the node with the new binary.

   No manual action is required on the validator once the binary is staged.

---

## Production Systemd Service

Create `/etc/systemd/system/tamizhi.service`:

```ini
[Unit]
Description=Tamizhi Blockchain Node (Cosmovisor)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=tamizhi
Group=tamizhi
WorkingDirectory=/home/tamizhi

# Load all DAEMON_* variables from the env file
EnvironmentFile=/home/tamizhi/chain/scripts/cosmovisor-env.sh

ExecStart=/home/tamizhi/go/bin/cosmovisor run start \
    --home /home/tamizhi/.tamizhi \
    --minimum-gas-prices 0.001utmz

Restart=always
RestartSec=5s
LimitNOFILE=65535

StandardOutput=journal
StandardError=journal
SyslogIdentifier=tamizhi

[Install]
WantedBy=multi-user.target
```

> **Note:** `EnvironmentFile` cannot execute shell code directly. Convert `cosmovisor-env.sh` to a plain `KEY=value` file for use with `EnvironmentFile`, or call the script from `ExecStartPre` and export variables to a temp file. Alternatively, set each `Environment=` line explicitly in the unit.

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tamizhi
sudo systemctl start tamizhi
sudo journalctl -u tamizhi -f
```

---

## Emergency Rollback Procedure

If an upgrade causes issues and the chain halts, follow these steps:

### 1. Stop the node

```bash
sudo systemctl stop tamizhi
```

### 2. Restore from Cosmovisor backup

Cosmovisor backs up the data directory before swapping binaries (unless `UNSAFE_SKIP_BACKUP=true`). The backup is written to `$DAEMON_BACKUP_DIR` (default: `~/.tamizhi/cosmovisor/backup`).

```bash
# Identify the backup (timestamped directory)
ls ~/.tamizhi/cosmovisor/backup/

# Restore
cp -r ~/.tamizhi/cosmovisor/backup/<timestamp>/* ~/.tamizhi/data/
```

### 3. Revert to the previous binary

```bash
# Point Cosmovisor back to the genesis binary or the last known-good upgrade binary
# by removing (or renaming) the broken upgrade directory:
mv ~/.tamizhi/cosmovisor/upgrades/v1.1.0 ~/.tamizhi/cosmovisor/upgrades/v1.1.0.broken
```

### 4. Clear the upgrade plan

If the chain panics on startup because it still sees the upgrade plan, delete it:

```bash
rm -f ~/.tamizhi/data/upgrade-info.json
```

### 5. Restart

```bash
sudo systemctl start tamizhi
sudo journalctl -u tamizhi -f
```

### 6. Coordinate with the community

Submit a governance proposal to cancel or reschedule the upgrade at a new height, giving validators time to investigate and fix the issue before retrying.
