#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BINARY="${BINARY:-$CHAIN_DIR/build/tamizhi}"
if [ ! -f "$BINARY" ] && [ -f "$CHAIN_DIR/tamizhi" ]; then
  BINARY="$CHAIN_DIR/tamizhi"
fi

HOME_DIR="${HOME_DIR:-$HOME/.tamizhi-localnet}"
CHAIN_ID="tamizhi-localnet-1"
MONIKER="tamizhi-localnet"
KEY_NAME="validator"
KEYRING="test"
DENOM="utmz"

echo "=== Tamizhi L1 Localnet Setup ==="
echo "Binary : $BINARY"
echo "Home   : $HOME_DIR"
echo "Chain  : $CHAIN_ID"

if [ ! -f "$BINARY" ]; then
  echo "Binary not found at $BINARY! Building..."
  make -C "$CHAIN_DIR" build
fi

# Reset existing home
rm -rf "$HOME_DIR"

# Stop any previous node holding ports
if lsof -ti :26657,1317,6060,9090 >/dev/null 2>&1; then
  echo "Stopping previous node holding localnet ports (26657, 1317, 6060, 9090)..."
  lsof -ti :26657,1317,6060,9090 | xargs kill -9 2>/dev/null || true
  pkill -9 -f "tamizhi" 2>/dev/null || true
  sleep 2
fi

echo "Initializing node..."
"$BINARY" init "$MONIKER" --chain-id "$CHAIN_ID" --home "$HOME_DIR" --default-denom "$DENOM" 2>&1 | tail -3

GENESIS="$HOME_DIR/config/genesis.json"
APP_TOML="$HOME_DIR/config/app.toml"

echo "Patching genesis for $DENOM..."
python3 - "$GENESIS" << 'PYEOF'
import sys, json
path = sys.argv[1]
with open(path) as f:
    d = json.load(f)
app = d.setdefault("app_state", {})
app.setdefault("staking", {}).setdefault("params", {})["bond_denom"] = "utmz"
app.setdefault("mint", {}).setdefault("params", {})["mint_denom"] = "utmz"
app.setdefault("crisis", {}).setdefault("constant_fee", {})["denom"] = "utmz"
for c in app.setdefault("gov", {}).setdefault("params", {}).get("min_deposit", []):
    c["denom"] = "utmz"
for c in app.setdefault("gov", {}).setdefault("params", {}).get("expedited_min_deposit", []):
    c["denom"] = "utmz"
with open(path, "w") as f:
    json.dump(d, f, indent=2)
PYEOF

echo "Configuring app.toml (enabling REST and CORS)..."
sed -i.bak -e 's|^enable = false|enable = true|g' \
           -e 's|^enabled-unsafe-cors = false|enabled-unsafe-cors = true|g' \
           -e 's|^swagger = false|swagger = true|g' \
           "$APP_TOML"

echo "Creating validator key..."
"$BINARY" keys add "$KEY_NAME" --keyring-backend "$KEYRING" --home "$HOME_DIR" --output json > /dev/null 2>&1
ADDR=$("$BINARY" keys show "$KEY_NAME" --keyring-backend "$KEYRING" --home "$HOME_DIR" -a)
echo "Validator address: $ADDR"

# Also add alice and bob for testing
"$BINARY" keys add alice --keyring-backend "$KEYRING" --home "$HOME_DIR" > /dev/null 2>&1
ALICE_ADDR=$("$BINARY" keys show alice --keyring-backend "$KEYRING" --home "$HOME_DIR" -a)
"$BINARY" keys add bob --keyring-backend "$KEYRING" --home "$HOME_DIR" > /dev/null 2>&1
BOB_ADDR=$("$BINARY" keys show bob --keyring-backend "$KEYRING" --home "$HOME_DIR" -a)

echo "Adding genesis accounts..."
"$BINARY" genesis add-genesis-account "$ADDR" 1000000000000000utmz --home "$HOME_DIR" --keyring-backend "$KEYRING"
"$BINARY" genesis add-genesis-account "$ALICE_ADDR" 1000000000000utmz --home "$HOME_DIR" --keyring-backend "$KEYRING"
"$BINARY" genesis add-genesis-account "$BOB_ADDR" 1000000000000utmz --home "$HOME_DIR" --keyring-backend "$KEYRING"

echo "Creating genesis transaction..."
"$BINARY" genesis gentx "$KEY_NAME" 100000000000utmz \
  --chain-id "$CHAIN_ID" \
  --keyring-backend "$KEYRING" \
  --home "$HOME_DIR" > /dev/null 2>&1

echo "Collecting genesis transactions..."
"$BINARY" genesis collect-gentxs --home "$HOME_DIR" > /dev/null 2>&1

echo "Validating genesis..."
"$BINARY" genesis validate "$GENESIS"

echo ""
echo "=== Starting Tamizhi L1 Node ==="
echo "RPC:  http://localhost:26657"
echo "API:  http://localhost:1317"
echo "gRPC: localhost:9090"
echo ""

exec "$BINARY" start \
  --home "$HOME_DIR" \
  --minimum-gas-prices 1000utmz \
  --log_level info
