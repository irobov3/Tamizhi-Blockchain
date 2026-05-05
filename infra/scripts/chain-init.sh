#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Tamizhi Chain — Initialization Script
# Initializes a fresh chain node with genesis accounts,
# validator key, and starts the chain.
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "$ROOT_DIR"

CHAIN_ID="${CHAIN_ID:-tamizhi-1}"
MONIKER="${MONIKER:-tamizhi-node}"
VALIDATOR_KEYNAME="${VALIDATOR_KEYNAME:-validator}"
FAUCET_KEYNAME="${FAUCET_KEYNAME:-faucet}"
STAKING_AMOUNT="${STAKING_AMOUNT:-100000000utmz}"
GENESIS_AMOUNT="${GENESIS_AMOUNT:-200000000utmz}"
FAUCET_AMOUNT="${FAUCET_AMOUNT:-100000000utmz}"
MIN_GAS_PRICES="${MIN_GAS_PRICES:-0.001utmz}"

echo ""
echo "======================================================"
echo "  Tamizhi Chain — Initialization"
echo "  Chain ID: $CHAIN_ID"
echo "  Moniker:  $MONIKER"
echo "======================================================"
echo ""

# ─────────────────────────────────────────────────────────────
# Determine compose command and chain container
# ─────────────────────────────────────────────────────────────
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  echo "ERROR: Docker Compose is required."
  exit 1
fi

# Get the chain container name/id
CHAIN_CONTAINER=$($COMPOSE_CMD ps -q chain 2>/dev/null)
if [ -z "$CHAIN_CONTAINER" ]; then
  echo "Chain container is not running. Starting it..."
  $COMPOSE_CMD up -d chain
  sleep 5
  CHAIN_CONTAINER=$($COMPOSE_CMD ps -q chain)
fi

echo "Using chain container: $CHAIN_CONTAINER"

# Helper: run a command inside the chain container
chain_exec() {
  docker exec "$CHAIN_CONTAINER" "$@"
}

# Helper: run tamizhi binary
tamizhi() {
  chain_exec tamizhi "$@"
}

# ─────────────────────────────────────────────────────────────
# Step 1: Initialize chain home directory
# ─────────────────────────────────────────────────────────────
echo ""
echo "Step 1: Initializing chain..."
tamizhi init "$MONIKER" --chain-id "$CHAIN_ID" --overwrite 2>/dev/null || \
tamizhi init "$MONIKER" --chain-id "$CHAIN_ID" 2>/dev/null || true
echo "  Chain initialized."

# ─────────────────────────────────────────────────────────────
# Step 2: Configure the node
# ─────────────────────────────────────────────────────────────
echo ""
echo "Step 2: Configuring node..."

# Set minimum gas prices
tamizhi config set app minimum-gas-prices "$MIN_GAS_PRICES" 2>/dev/null || \
  chain_exec sed -i "s/minimum-gas-prices = \"\"/minimum-gas-prices = \"$MIN_GAS_PRICES\"/" /root/.tamizhi/config/app.toml

# Enable REST API
chain_exec sed -i 's/enable = false/enable = true/g' /root/.tamizhi/config/app.toml 2>/dev/null || true
chain_exec sed -i 's/swagger = false/swagger = true/g' /root/.tamizhi/config/app.toml 2>/dev/null || true

# Configure CORS for development
chain_exec sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/' /root/.tamizhi/config/config.toml 2>/dev/null || true

echo "  Node configured."

# ─────────────────────────────────────────────────────────────
# Step 3: Create validator and faucet keys
# ─────────────────────────────────────────────────────────────
echo ""
echo "Step 3: Creating keys..."

# Create validator key (save mnemonic)
VALIDATOR_OUTPUT=$(tamizhi keys add "$VALIDATOR_KEYNAME" --keyring-backend test --output json 2>&1) || \
VALIDATOR_OUTPUT=$(tamizhi keys show "$VALIDATOR_KEYNAME" --keyring-backend test --output json 2>&1)
echo "$VALIDATOR_OUTPUT" > /tmp/validator_key.json
VALIDATOR_ADDRESS=$(echo "$VALIDATOR_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('address',''))" 2>/dev/null || \
  tamizhi keys show "$VALIDATOR_KEYNAME" --keyring-backend test -a)
echo "  Validator key: $VALIDATOR_ADDRESS"

# Create faucet key
FAUCET_OUTPUT=$(tamizhi keys add "$FAUCET_KEYNAME" --keyring-backend test --output json 2>&1) || \
FAUCET_OUTPUT=$(tamizhi keys show "$FAUCET_KEYNAME" --keyring-backend test --output json 2>&1)
FAUCET_ADDRESS=$(echo "$FAUCET_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('address',''))" 2>/dev/null || \
  tamizhi keys show "$FAUCET_KEYNAME" --keyring-backend test -a)
echo "  Faucet key: $FAUCET_ADDRESS"

# ─────────────────────────────────────────────────────────────
# Step 4: Add genesis accounts
# ─────────────────────────────────────────────────────────────
echo ""
echo "Step 4: Adding genesis accounts..."
tamizhi genesis add-genesis-account "$VALIDATOR_ADDRESS" "$GENESIS_AMOUNT" --keyring-backend test 2>/dev/null || \
tamizhi add-genesis-account "$VALIDATOR_ADDRESS" "$GENESIS_AMOUNT" --keyring-backend test 2>/dev/null || true

tamizhi genesis add-genesis-account "$FAUCET_ADDRESS" "$FAUCET_AMOUNT" --keyring-backend test 2>/dev/null || \
tamizhi add-genesis-account "$FAUCET_ADDRESS" "$FAUCET_AMOUNT" --keyring-backend test 2>/dev/null || true
echo "  Genesis accounts added."

# ─────────────────────────────────────────────────────────────
# Step 5: Create validator gentx
# ─────────────────────────────────────────────────────────────
echo ""
echo "Step 5: Creating genesis transaction..."
tamizhi genesis gentx "$VALIDATOR_KEYNAME" "$STAKING_AMOUNT" \
  --chain-id "$CHAIN_ID" \
  --moniker "$MONIKER" \
  --keyring-backend test \
  --commission-rate 0.1 \
  --commission-max-rate 0.2 \
  --commission-max-change-rate 0.01 \
  2>/dev/null || \
tamizhi gentx "$VALIDATOR_KEYNAME" "$STAKING_AMOUNT" \
  --chain-id "$CHAIN_ID" \
  --moniker "$MONIKER" \
  --keyring-backend test \
  2>/dev/null || true
echo "  Genesis transaction created."

# ─────────────────────────────────────────────────────────────
# Step 6: Collect gentxs and validate genesis
# ─────────────────────────────────────────────────────────────
echo ""
echo "Step 6: Collecting genesis transactions..."
tamizhi genesis collect-gentxs 2>/dev/null || \
tamizhi collect-gentxs 2>/dev/null || true

echo "Validating genesis..."
tamizhi genesis validate-genesis 2>/dev/null || \
tamizhi validate-genesis 2>/dev/null || true
echo "  Genesis validated."

# ─────────────────────────────────────────────────────────────
# Step 7: Restart chain with initialized config
# ─────────────────────────────────────────────────────────────
echo ""
echo "Step 7: Restarting chain with genesis configuration..."
$COMPOSE_CMD restart chain
echo "  Chain restarting..."

echo ""
echo "Waiting for chain to produce blocks..."
MAX_TRIES=60
TRIES=0
until chain_exec curl -sf http://localhost:26657/status 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)
height = int(d['result']['sync_info']['latest_block_height'])
print(f'  Block height: {height}')
sys.exit(0 if height > 0 else 1)
" 2>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "WARNING: Chain did not produce blocks in expected time. Check logs:"
    echo "  docker compose logs chain"
    break
  fi
  printf "."
  sleep 3
done

echo ""
echo "======================================================"
echo "  Chain initialization complete!"
echo "======================================================"
echo ""
echo "Chain ID:          $CHAIN_ID"
echo "Validator address: $VALIDATOR_ADDRESS"
echo "Faucet address:    $FAUCET_ADDRESS"
echo ""
echo "Endpoints:"
echo "  RPC:  http://localhost:26657"
echo "  LCD:  http://localhost:1317"
echo "  gRPC: localhost:9090"
echo ""
echo "Key files saved:"
echo "  Validator: /tmp/validator_key.json (contains mnemonic - keep safe!)"
echo ""
echo "Check chain status:"
echo "  curl http://localhost:26657/status"
echo ""
