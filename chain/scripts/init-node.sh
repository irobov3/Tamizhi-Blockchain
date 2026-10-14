#!/usr/bin/env bash
# ============================================================
# Tamizhi Chain — Single-node initialization script
#
# This script initializes a single validator node for the
# Tamizhi blockchain (chain ID: tamizhi-1).
#
# Usage:
#   ./scripts/init-node.sh [--key-name <name>] [--home <dir>] [--moniker <name>]
#
# Options:
#   --key-name  Name of the validator key (default: validator)
#   --home      Node home directory (default: ~/.tamizhi)
#   --moniker   Validator moniker (default: tamizhi-node)
#
# After running, start the node with:
#   tamizhi start --home $HOME_DIR
# ============================================================

set -euo pipefail

# -------------------------------------------------------
# Defaults — override with env vars or CLI flags
# -------------------------------------------------------
BINARY="${BINARY:-tamizhi}"
CHAIN_ID="${CHAIN_ID:-tamizhi-1}"
MONIKER="${MONIKER:-tamizhi-node}"
HOME_DIR="${HOME_DIR:-$HOME/.tamizhi}"
KEY_NAME="${KEY_NAME:-validator}"
KEYRING_BACKEND="${KEYRING_BACKEND:-test}"

GENESIS_COINS="${GENESIS_COINS:-500000000utmz}"    # 500 TMZ genesis balance
VALIDATOR_STAKE="${VALIDATOR_STAKE:-100000000utmz}" # 100 TMZ self-delegation
MIN_SELF_DELEGATION="${MIN_SELF_DELEGATION:-1}"
COMMISSION_RATE="${COMMISSION_RATE:-0.10}"
COMMISSION_MAX_RATE="${COMMISSION_MAX_RATE:-0.20}"
COMMISSION_MAX_CHANGE_RATE="${COMMISSION_MAX_CHANGE_RATE:-0.01}"
MIN_GAS_PRICES="${MIN_GAS_PRICES:-0.001utmz}"

# RPC / API / gRPC listen addresses
RPC_LISTEN="${RPC_LISTEN:-tcp://0.0.0.0:26657}"
P2P_LISTEN="${P2P_LISTEN:-tcp://0.0.0.0:26656}"
API_LISTEN="${API_LISTEN:-tcp://0.0.0.0:1317}"
GRPC_LISTEN="${GRPC_LISTEN:-0.0.0.0:9090}"

# -------------------------------------------------------
# Parse CLI flags
# -------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key-name)  KEY_NAME="$2";  shift 2 ;;
    --home)      HOME_DIR="$2";  shift 2 ;;
    --moniker)   MONIKER="$2";   shift 2 ;;
    --chain-id)  CHAIN_ID="$2";  shift 2 ;;
    *)           echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

# -------------------------------------------------------
# Helper functions
# -------------------------------------------------------
info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }
error() { echo "[ERROR] $*" >&2; exit 1; }
separator() { echo "------------------------------------------------------------"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if ! command -v "$BINARY" &>/dev/null; then
  if [ -f "$CHAIN_DIR/build/tamizhi" ]; then
    BINARY="$CHAIN_DIR/build/tamizhi"
  elif [ -f "$CHAIN_DIR/tamizhi" ]; then
    BINARY="$CHAIN_DIR/tamizhi"
  else
    error "'$BINARY' not found on PATH or in $CHAIN_DIR/build/. Run 'make build' first."
  fi
fi

info "Tamizhi node initialization"
info "  Chain ID       : $CHAIN_ID"
info "  Moniker        : $MONIKER"
info "  Home directory : $HOME_DIR"
info "  Key name       : $KEY_NAME"
info "  Keyring backend: $KEYRING_BACKEND"
separator

# -------------------------------------------------------
# Step 1: Initialize the node
# -------------------------------------------------------
info "Step 1: Initializing node..."
"$BINARY" init "$MONIKER" \
  --chain-id "$CHAIN_ID" \
  --home     "$HOME_DIR" \
  --overwrite
info "  Node initialized at $HOME_DIR"

# -------------------------------------------------------
# Step 2: Add validator key
# -------------------------------------------------------
info "Step 2: Adding validator key '$KEY_NAME'..."
KEY_EXISTS=false
if "$BINARY" keys show "$KEY_NAME" \
    --home "$HOME_DIR" \
    --keyring-backend "$KEYRING_BACKEND" &>/dev/null; then
  warn "  Key '$KEY_NAME' already exists — skipping creation."
  KEY_EXISTS=true
fi

if [ "$KEY_EXISTS" = false ]; then
  "$BINARY" keys add "$KEY_NAME" \
    --home             "$HOME_DIR" \
    --keyring-backend  "$KEYRING_BACKEND" \
    --output           json 2>&1 | tee /tmp/tamizhi-key-output.json
  info "  Key created. Mnemonic saved to /tmp/tamizhi-key-output.json"
  warn "  IMPORTANT: Back up your mnemonic phrase securely and delete /tmp/tamizhi-key-output.json."
fi

VALIDATOR_ADDR=$("$BINARY" keys show "$KEY_NAME" \
  --home "$HOME_DIR" \
  --keyring-backend "$KEYRING_BACKEND" \
  --address)
info "  Validator address: $VALIDATOR_ADDR"

# -------------------------------------------------------
# Step 3: Add genesis account
# -------------------------------------------------------
info "Step 3: Adding genesis account ($GENESIS_COINS)..."
"$BINARY" genesis add-genesis-account "$VALIDATOR_ADDR" "$GENESIS_COINS" \
  --home             "$HOME_DIR" \
  --keyring-backend  "$KEYRING_BACKEND"
info "  Genesis account added."

# -------------------------------------------------------
# Step 4b: Patch genesis denom from 'stake' to 'utmz'
#
# The SDK's `init` command hard-codes bond_denom="stake" in several
# genesis sections regardless of the binary's default denom.  We patch
# them here before the gentx is created so the validator self-delegation
# references the correct denom.
# -------------------------------------------------------
info "Step 4b: Patching genesis denom (stake → utmz)..."
GENESIS_FILE="$HOME_DIR/config/genesis.json"

python3 - "$GENESIS_FILE" <<'PYEOF'
import sys, json

path = sys.argv[1]
with open(path) as f:
    d = json.load(f)

app = d["app_state"]

# Staking bond denom
app["staking"]["params"]["bond_denom"] = "utmz"

# Mint denom
app["mint"]["params"]["mint_denom"] = "utmz"

# Crisis constant fee
app["crisis"]["constant_fee"]["denom"] = "utmz"

# Gov min deposit
for coin in app["gov"]["params"].get("min_deposit", []):
    if coin.get("denom") in ("stake", "uatom"):
        coin["denom"] = "utmz"

# Distribution (optional — some SDK versions include this)
if "distribution" in app:
    pass  # no denom field in distribution params

with open(path, "w") as f:
    json.dump(d, f, indent=2)

print("  genesis.json patched successfully.")
PYEOF

info "  Denom patched."

# -------------------------------------------------------
# Step 4: Create gentx
# -------------------------------------------------------
info "Step 4: Creating gentx (self-delegation: $VALIDATOR_STAKE)..."
"$BINARY" genesis gentx "$KEY_NAME" "$VALIDATOR_STAKE" \
  --chain-id                  "$CHAIN_ID" \
  --home                      "$HOME_DIR" \
  --keyring-backend            "$KEYRING_BACKEND" \
  --moniker                   "$MONIKER" \
  --commission-rate           "$COMMISSION_RATE" \
  --commission-max-rate       "$COMMISSION_MAX_RATE" \
  --commission-max-change-rate "$COMMISSION_MAX_CHANGE_RATE" \
  --min-self-delegation       "$MIN_SELF_DELEGATION"
info "  gentx created."

# -------------------------------------------------------
# Step 5: Collect gentxs
# -------------------------------------------------------
info "Step 5: Collecting gentxs..."
"$BINARY" genesis collect-gentxs --home "$HOME_DIR"
info "  Gentxs collected."

# -------------------------------------------------------
# Step 6: Validate genesis
# -------------------------------------------------------
info "Step 6: Validating genesis file..."
"$BINARY" genesis validate "$GENESIS_FILE"
info "  Genesis is valid."

# -------------------------------------------------------
# Step 7: Configure app.toml
# -------------------------------------------------------
info "Step 7: Configuring app.toml..."

APP_TOML="$HOME_DIR/config/app.toml"

# Minimum gas prices
sed -i.bak "s|minimum-gas-prices = \"\"|minimum-gas-prices = \"$MIN_GAS_PRICES\"|g" "$APP_TOML"

# Enable REST API
sed -i.bak 's|enable = false|enable = true|g' "$APP_TOML"

# Enable swagger
sed -i.bak 's|swagger = false|swagger = true|g' "$APP_TOML"

# API address
sed -i.bak "s|address = \"tcp://localhost:1317\"|address = \"$API_LISTEN\"|g" "$APP_TOML"

# gRPC address
sed -i.bak "s|address = \"localhost:9090\"|address = \"$GRPC_LISTEN\"|g" "$APP_TOML"

# Enable CORS for development
sed -i.bak 's|enabled-unsafe-cors = false|enabled-unsafe-cors = true|g' "$APP_TOML"

# Enable gRPC
sed -i.bak 's|^\[grpc\]|[grpc]|; /^\[grpc\]/{n; s|enable = false|enable = true|}' "$APP_TOML" || true

info "  app.toml configured."

# -------------------------------------------------------
# Step 8: Configure config.toml
# -------------------------------------------------------
info "Step 8: Configuring config.toml..."

CFG_TOML="$HOME_DIR/config/config.toml"

# RPC listen address
sed -i.bak "s|laddr = \"tcp://127.0.0.1:26657\"|laddr = \"$RPC_LISTEN\"|g" "$CFG_TOML"

# P2P listen address
sed -i.bak "s|laddr = \"tcp://0.0.0.0:26656\"|laddr = \"$P2P_LISTEN\"|g" "$CFG_TOML"

# Enable CORS for RPC
sed -i.bak 's|cors_allowed_origins = \[\]|cors_allowed_origins = ["*"]|g' "$CFG_TOML"

# Allow all hosts in CORS (development)
sed -i.bak 's|cors_allowed_methods = \["HEAD", "GET", "POST"\]|cors_allowed_methods = ["HEAD", "GET", "POST", "PUT", "DELETE", "OPTIONS"]|g' "$CFG_TOML" || true

info "  config.toml configured."

# -------------------------------------------------------
# Step 9: Set client config
# -------------------------------------------------------
info "Step 9: Setting client config..."

"$BINARY" config set client chain-id       "$CHAIN_ID"        --home "$HOME_DIR" 2>/dev/null || true
"$BINARY" config set client keyring-backend "$KEYRING_BACKEND" --home "$HOME_DIR" 2>/dev/null || true
"$BINARY" config set client node           "$RPC_LISTEN"      --home "$HOME_DIR" 2>/dev/null || true

# Clean up .bak files
find "$HOME_DIR/config" -name "*.bak" -delete 2>/dev/null || true

# -------------------------------------------------------
# Summary
# -------------------------------------------------------
separator
info "Tamizhi node initialization COMPLETE"
info ""
info "  Chain ID        : $CHAIN_ID"
info "  Moniker         : $MONIKER"
info "  Home directory  : $HOME_DIR"
info "  Validator addr  : $VALIDATOR_ADDR"
info "  Genesis coins   : $GENESIS_COINS"
info "  Self delegation : $VALIDATOR_STAKE"
info ""
info "  REST API        : http://localhost:1317"
info "  RPC             : http://localhost:26657"
info "  gRPC            : localhost:9090"
info "  Swagger UI      : http://localhost:1317/swagger/"
info ""
info "  To start the node:"
info "    $BINARY start --home $HOME_DIR"
info ""
info "  Or using the Makefile:"
info "    make start"
separator
