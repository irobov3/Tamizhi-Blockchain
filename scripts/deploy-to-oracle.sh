#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  deploy-to-oracle.sh  —  One-shot Tamizhi testnet deploy
#
#  Usage:
#    ./scripts/deploy-to-oracle.sh <ORACLE_VM_IP> [SSH_KEY_PATH]
#
#  What it does (fully automated, ~15 min on a fresh VM):
#    1. Copies the chain binary to the Oracle VM
#    2. Installs systemd service + nginx reverse proxy
#    3. Initialises a single-validator testnet genesis
#    4. Opens firewall ports (26656 P2P, 26657 RPC, 1317 REST, 9090 gRPC)
#    5. Starts the chain as a background service
#    6. Prints live endpoint URLs
#
#  Prerequisites (local machine):
#    - ssh-agent running with your Oracle key loaded  (or pass KEY_PATH)
#    - tamizhi binary compiled: make build
#    - jq, ssh, scp installed
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# ─── Args ──────────────────────────────────────────────────────
VM_IP="${1:-}"
SSH_KEY="${2:-$HOME/.ssh/id_rsa}"

if [[ -z "$VM_IP" ]]; then
  echo "Usage: $0 <ORACLE_VM_IP> [SSH_KEY_PATH]"
  echo "Example: $0 140.245.22.99 ~/.ssh/oracle_free"
  exit 1
fi

# ─── Config (change these if you like) ─────────────────────────
CHAIN_ID="tamizhi-testnet-1"
MONIKER="tamizhi-validator-1"
DENOM="utmz"
BOND_DENOM="utmz"
BINARY_NAME="tamizhi"
REMOTE_USER="ubuntu"          # Oracle Ubuntu default
REMOTE_HOME="/home/ubuntu"
CHAIN_DIR="$REMOTE_HOME/.tamizhi"
BIN_SRC="$(cd "$(dirname "$0")/.." && pwd)/chain/$BINARY_NAME"
SERVICE_NAME="tamizhid"
DOMAIN="${DOMAIN:-}"          # optional: set to "rpc.tamizhi.ai" to auto-configure nginx

SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15"

# ─── Helpers ────────────────────────────────────────────────────
log()  { echo -e "\033[1;36m[deploy]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[  ok  ]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ err  ]\033[0m $*" >&2; }
die()  { err "$*"; exit 1; }

ssh_run() { ssh $SSH_OPTS "$REMOTE_USER@$VM_IP" "$@"; }
scp_up()  { scp $SSH_OPTS "$1" "$REMOTE_USER@$VM_IP:$2"; }

# ─── 0. Pre-flight ───────────────────────────────────────────────
log "Pre-flight checks…"
[[ -f "$BIN_SRC" ]]  || die "Binary not found: $BIN_SRC  →  run: make build"
[[ -f "$SSH_KEY" ]]  || die "SSH key not found: $SSH_KEY"
ssh_run "echo 'SSH OK'" > /dev/null || die "Cannot SSH to $VM_IP"
ok "SSH reachable"

# ─── 1. Upload binary ───────────────────────────────────────────
log "Uploading binary ($(du -sh "$BIN_SRC" | cut -f1))…"
scp_up "$BIN_SRC" "/tmp/$BINARY_NAME"
ssh_run "sudo install -m 755 /tmp/$BINARY_NAME /usr/local/bin/$BINARY_NAME && rm /tmp/$BINARY_NAME"
ok "Binary installed at /usr/local/bin/$BINARY_NAME"

# ─── 2. System deps ─────────────────────────────────────────────
log "Installing system deps (curl, jq, nginx)…"
ssh_run "sudo apt-get update -qq && sudo apt-get install -y -qq curl jq nginx ufw"
ok "Deps installed"

# ─── 3. Init chain ──────────────────────────────────────────────
log "Initialising chain ($CHAIN_ID)…"
ssh_run "
  set -e
  # Wipe any previous run
  rm -rf $CHAIN_DIR

  # Init
  $BINARY_NAME init '$MONIKER' --chain-id $CHAIN_ID --default-denom $DENOM --home $CHAIN_DIR 2>/dev/null

  # Fix staking denom in genesis
  sed -i 's/\"stake\"/\"$BOND_DENOM\"/g' $CHAIN_DIR/config/genesis.json

  # Enable API + CORS in app.toml
  sed -i 's/enable = false/enable = true/g'                           $CHAIN_DIR/config/app.toml
  sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' $CHAIN_DIR/config/app.toml
  sed -i 's/address = \"tcp:\/\/localhost:1317\"/address = \"tcp:\/\/0.0.0.0:1317\"/' $CHAIN_DIR/config/app.toml

  # RPC: listen on all interfaces
  sed -i 's|laddr = \"tcp://127.0.0.1:26657\"|laddr = \"tcp://0.0.0.0:26657\"|g' $CHAIN_DIR/config/config.toml

  # Reduce block time to 2s for testnet
  sed -i 's/timeout_commit = \"5s\"/timeout_commit = \"2s\"/' $CHAIN_DIR/config/config.toml

  # Create validator key
  $BINARY_NAME keys add validator --keyring-backend test --home $CHAIN_DIR 2>&1

  # Get validator address
  VALIDATOR_ADDR=\$($BINARY_NAME keys show validator -a --keyring-backend test --home $CHAIN_DIR)
  echo \"Validator address: \$VALIDATOR_ADDR\"

  # Fund validator in genesis
  $BINARY_NAME genesis add-genesis-account \$VALIDATOR_ADDR 10000000000000$DENOM --home $CHAIN_DIR

  # Create gentx
  $BINARY_NAME genesis gentx validator 1000000000$DENOM \
    --chain-id $CHAIN_ID \
    --keyring-backend test \
    --home $CHAIN_DIR \
    --moniker '$MONIKER' \
    --commission-rate '0.05' \
    --commission-max-rate '0.20' \
    --commission-max-change-rate '0.01' \
    --min-self-delegation '1'

  # Collect gentxs
  $BINARY_NAME genesis collect-gentxs --home $CHAIN_DIR

  echo 'Genesis complete'
"
ok "Chain initialised"

# ─── 4. Systemd service ─────────────────────────────────────────
log "Creating systemd service ($SERVICE_NAME)…"
ssh_run "sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << 'UNIT'
[Unit]
Description=Tamizhi Blockchain Node
After=network-online.target
Wants=network-online.target

[Service]
User=$REMOTE_USER
ExecStart=/usr/local/bin/$BINARY_NAME start --home $CHAIN_DIR
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
UNIT"

ssh_run "
  sudo systemctl daemon-reload
  sudo systemctl enable $SERVICE_NAME
  sudo systemctl start  $SERVICE_NAME
  sleep 3
  sudo systemctl is-active $SERVICE_NAME
"
ok "Service started"

# ─── 5. Firewall ────────────────────────────────────────────────
log "Opening firewall ports…"
ssh_run "
  sudo ufw allow 22/tcp   comment 'SSH'
  sudo ufw allow 26656/tcp comment 'CometBFT P2P'
  sudo ufw allow 26657/tcp comment 'CometBFT RPC'
  sudo ufw allow 1317/tcp  comment 'Cosmos REST API'
  sudo ufw allow 9090/tcp  comment 'gRPC'
  sudo ufw allow 80/tcp    comment 'HTTP'
  sudo ufw allow 443/tcp   comment 'HTTPS'
  sudo ufw --force enable
"
ok "Firewall configured"

# ─── 6. Nginx reverse proxy ─────────────────────────────────────
log "Configuring nginx…"
NGINX_SERVER_NAME="${DOMAIN:-$VM_IP}"

ssh_run "sudo tee /etc/nginx/sites-available/tamizhi > /dev/null << 'NGINX'
# Tamizhi RPC  (port 26657 → 80/rpc)
server {
    listen 80;
    server_name $NGINX_SERVER_NAME;

    # Health check
    location /healthz {
        return 200 'ok\n';
        add_header Content-Type text/plain;
    }

    # CometBFT RPC
    location /rpc/ {
        proxy_pass         http://127.0.0.1:26657/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Cosmos REST API
    location /api/ {
        proxy_pass         http://127.0.0.1:1317/;
        proxy_set_header   Host \$host;
        add_header         Access-Control-Allow-Origin '*';
        add_header         Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header         Access-Control-Allow-Headers 'Content-Type, Authorization';
    }

    # gRPC-Web (optional, requires grpc_pass module)
    # location /grpc/ { ... }
}
NGINX"

ssh_run "
  sudo ln -sf /etc/nginx/sites-available/tamizhi /etc/nginx/sites-enabled/tamizhi
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
"
ok "nginx configured"

# ─── 7. Oracle Cloud security list reminder ─────────────────────
log "⚠️  Oracle Cloud Security List — open these ports in the Console:"
echo ""
echo "  Go to:  Oracle Cloud Console → Networking → VCN → Security Lists → Ingress Rules"
echo "  Add rules for:"
echo "    TCP  22    (SSH)"
echo "    TCP  80    (HTTP)"
echo "    TCP  443   (HTTPS)"
echo "    TCP  26656 (P2P)"
echo "    TCP  26657 (RPC)"
echo "    TCP  1317  (REST)"
echo "    TCP  9090  (gRPC)"
echo ""

# ─── 8. Smoke test ──────────────────────────────────────────────
log "Waiting 8s for node to produce first block…"
sleep 8

STATUS=$(ssh_run "curl -s http://127.0.0.1:26657/status" 2>/dev/null || echo '{}')
BLOCK=$(echo "$STATUS" | jq -r '.result.sync_info.latest_block_height // "?"' 2>/dev/null)
CATCHING=$(echo "$STATUS" | jq -r '.result.sync_info.catching_up // "?"' 2>/dev/null)

ok "Node status: block=$BLOCK  catching_up=$CATCHING"

# ─── 9. Print summary ───────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          Tamizhi Testnet — LIVE 🎉                      ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Chain ID  : $CHAIN_ID"
echo "║  VM IP     : $VM_IP"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  ENDPOINTS                                               ║"
echo "║  RPC       : http://$VM_IP:26657                        ║"
echo "║  REST API  : http://$VM_IP:1317                         ║"
echo "║  gRPC      : $VM_IP:9090                                ║"
echo "║  Via nginx : http://$VM_IP/rpc/  (RPC proxy)            ║"
echo "║              http://$VM_IP/api/  (REST proxy)           ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  SSH commands                                            ║"
echo "║  Logs   : ssh -i $SSH_KEY $REMOTE_USER@$VM_IP 'journalctl -fu $SERVICE_NAME'"
echo "║  Status : ssh -i $SSH_KEY $REMOTE_USER@$VM_IP 'curl -s localhost:26657/status | jq .result.sync_info'"
echo "║  Stop   : ssh -i $SSH_KEY $REMOTE_USER@$VM_IP 'sudo systemctl stop $SERVICE_NAME'"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  NEXT STEPS                                              ║"
echo "║  1. Open Oracle Security List ports (see above)         ║"
if [[ -n "$DOMAIN" ]]; then
echo "║  2. Point DNS  $DOMAIN → $VM_IP                         ║"
echo "║  3. Run certbot for HTTPS:                              ║"
echo "║     sudo certbot --nginx -d $DOMAIN                     ║"
else
echo "║  2. Set \$DOMAIN and re-run for nginx vhost + certbot    ║"
fi
echo "║  3. Share RPC with validators for them to join          ║"
echo "╚══════════════════════════════════════════════════════════╝"
