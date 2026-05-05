#!/usr/bin/env bash
set -euo pipefail

BINARY="tamizhid"
CHAIN_ID="tamizhi-sec-1"
DENOM="utmz"
VALIDATORS=4
KEY_BACKEND="test"
# 100,000,000 TMZ per validator (6 decimals)
INITIAL_SUPPLY="100000000000000utmz"
# 25M TMZ staked per validator
BOND_AMOUNT="25000000000000utmz"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$ROOT_DIR/.testnet"

echo "════════════════════════════════════════════"
echo "   Tamizhi Security Blockchain — Localnet   "
echo "   Chain ID: $CHAIN_ID                      "
echo "   Token: TMZ ($DENOM)                      "
echo "════════════════════════════════════════════"

# ── Step 1: Build binary ────────────────────────────────────────────────────
if ! command -v "$BINARY" &>/dev/null; then
  echo "[1/7] Building $BINARY..."
  cd "$ROOT_DIR" && make build
  export PATH="$ROOT_DIR/build:$PATH"
else
  echo "[1/7] $BINARY already in PATH"
fi

# ── Step 2: Clean previous data ─────────────────────────────────────────────
echo "[2/7] Cleaning previous testnet data..."
rm -rf "$DATA_DIR"
mkdir -p "$DATA_DIR"

# ── Step 3: Initialize validator nodes ──────────────────────────────────────
echo "[3/7] Initializing $VALIDATORS validator nodes..."
for i in $(seq 1 $VALIDATORS); do
  NODE_HOME="$DATA_DIR/validator$i"
  MONIKER="tamizhi-validator-$i"

  $BINARY init "$MONIKER" --chain-id "$CHAIN_ID" --home "$NODE_HOME"

  # Configure CometBFT for ~3s block time
  sed -i.bak \
    -e 's|timeout_commit = "5s"|timeout_commit = "3s"|' \
    -e 's|timeout_propose = "3s"|timeout_propose = "2s"|' \
    -e 's|cors_allowed_origins = \[\]|cors_allowed_origins = ["*"]|' \
    "$NODE_HOME/config/config.toml"

  # Enable REST API, Swagger, gRPC
  sed -i.bak \
    -e 's|enable = false|enable = true|' \
    -e 's|swagger = false|swagger = true|' \
    -e 's|enabled-unsafe-cors = false|enabled-unsafe-cors = true|' \
    "$NODE_HOME/config/app.toml"

  # Add key
  $BINARY keys add "validator${i}" \
    --keyring-backend "$KEY_BACKEND" \
    --home "$NODE_HOME" \
    --output json > "$DATA_DIR/validator${i}_key.json" 2>&1

  echo "  ✓ validator$i initialized"
done

# ── Step 4: Seed node and RPC node ───────────────────────────────────────────
echo "[4/7] Initializing seed node and RPC node..."

for NODETYPE in seed rpc; do
  NODE_HOME="$DATA_DIR/$NODETYPE"
  $BINARY init "tamizhi-$NODETYPE" --chain-id "$CHAIN_ID" --home "$NODE_HOME"
  # RPC node: enable REST
  sed -i.bak -e 's|enable = false|enable = true|' -e 's|swagger = false|swagger = true|' "$NODE_HOME/config/app.toml"
  echo "  ✓ $NODETYPE node initialized"
done

# ── Step 5: Genesis accounts ─────────────────────────────────────────────────
echo "[5/7] Setting up genesis accounts (100M TMZ each)..."
PRIMARY_HOME="$DATA_DIR/validator1"
cp "$ROOT_DIR/config/genesis.json" "$PRIMARY_HOME/config/genesis.json"

for i in $(seq 1 $VALIDATORS); do
  NODE_HOME="$DATA_DIR/validator$i"
  ADDR=$($BINARY keys show "validator${i}" -a --keyring-backend "$KEY_BACKEND" --home "$NODE_HOME")

  $BINARY genesis add-genesis-account "$ADDR" "$INITIAL_SUPPLY" \
    --home "$PRIMARY_HOME" --keyring-backend "$KEY_BACKEND"

  echo "  ✓ validator$i: $ADDR"
done

# Faucet + monitoring service account
for KEYNAME in faucet monitor_service; do
  $BINARY keys add "$KEYNAME" --keyring-backend "$KEY_BACKEND" --home "$PRIMARY_HOME" \
    --output json > "$DATA_DIR/${KEYNAME}_key.json" 2>&1
  ADDR=$($BINARY keys show "$KEYNAME" -a --keyring-backend "$KEY_BACKEND" --home "$PRIMARY_HOME")
  $BINARY genesis add-genesis-account "$ADDR" "10000000000000utmz" \
    --home "$PRIMARY_HOME" --keyring-backend "$KEY_BACKEND"
  echo "  ✓ $KEYNAME: $ADDR"
done

FAUCET_ADDR=$($BINARY keys show faucet -a --keyring-backend "$KEY_BACKEND" --home "$PRIMARY_HOME")
MONITOR_ADDR=$($BINARY keys show monitor_service -a --keyring-backend "$KEY_BACKEND" --home "$PRIMARY_HOME")

# ── Step 6: Create gentxs ─────────────────────────────────────────────────────
echo "[6/7] Creating genesis transactions..."
mkdir -p "$PRIMARY_HOME/config/gentx"

for i in $(seq 1 $VALIDATORS); do
  NODE_HOME="$DATA_DIR/validator$i"
  cp "$PRIMARY_HOME/config/genesis.json" "$NODE_HOME/config/genesis.json"

  $BINARY genesis gentx "validator${i}" "$BOND_AMOUNT" \
    --chain-id "$CHAIN_ID" \
    --moniker "tamizhi-validator-${i}" \
    --keyring-backend "$KEY_BACKEND" \
    --home "$NODE_HOME" \
    --output-document "$PRIMARY_HOME/config/gentx/gentx-validator${i}.json" \
    --commission-rate "0.10" \
    --commission-max-rate "0.20" \
    --commission-max-change-rate "0.01" \
    --min-self-delegation "1000000" 2>/dev/null

  echo "  ✓ gentx for validator$i"
done

# ── Step 7: Collect and distribute ───────────────────────────────────────────
echo "[7/7] Collecting gentxs and distributing genesis..."
$BINARY genesis collect-gentxs --home "$PRIMARY_HOME"
$BINARY genesis validate-genesis --home "$PRIMARY_HOME"

for i in $(seq 2 $VALIDATORS); do
  cp "$PRIMARY_HOME/config/genesis.json" "$DATA_DIR/validator$i/config/genesis.json"
done
cp "$PRIMARY_HOME/config/genesis.json" "$DATA_DIR/seed/config/genesis.json"
cp "$PRIMARY_HOME/config/genesis.json" "$DATA_DIR/rpc/config/genesis.json"

# ── Configure persistent peers ────────────────────────────────────────────────
echo "Configuring peer mesh..."
NODE_IDS=()
for i in $(seq 1 $VALIDATORS); do
  NODE_HOME="$DATA_DIR/validator$i"
  ID=$($BINARY tendermint show-node-id --home "$NODE_HOME")
  PORT=$((26656 + (i-1)*10))
  NODE_IDS+=("${ID}@127.0.0.1:${PORT}")
done

SEED_ID=$($BINARY tendermint show-node-id --home "$DATA_DIR/seed")
SEED_PEER="${SEED_ID}@127.0.0.1:26700"

for i in $(seq 1 $VALIDATORS); do
  NODE_HOME="$DATA_DIR/validator$i"
  PEERS="$SEED_PEER"
  for j in "${!NODE_IDS[@]}"; do
    if [ $((j+1)) -ne $i ]; then
      PEERS+=",${NODE_IDS[$j]}"
    fi
  done
  sed -i.bak "s|persistent_peers = \"\"|persistent_peers = \"$PEERS\"|" "$NODE_HOME/config/config.toml"
done

# RPC node peers to all validators
ALL_PEERS=$(IFS=,; echo "${NODE_IDS[*]}")
sed -i.bak "s|persistent_peers = \"\"|persistent_peers = \"$ALL_PEERS\"|" "$DATA_DIR/rpc/config/config.toml"

# ── Write start script ────────────────────────────────────────────────────────
cat > "$DATA_DIR/start.sh" << 'STARTSCRIPT'
#!/usr/bin/env bash
set -euo pipefail
BINARY="tamizhid"
DATA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting Tamizhi Security Blockchain (tamizhi-sec-1)..."

# Validators
for i in 1 2 3 4; do
  PORT_P2P=$((26656 + (i-1)*10))
  PORT_RPC=$((26657 + (i-1)*10))
  PORT_REST=$((1317  + (i-1)))
  PORT_GRPC=$((9090  + (i-1)))

  $BINARY start \
    --home "$DATA_DIR/validator${i}" \
    --p2p.laddr "tcp://0.0.0.0:${PORT_P2P}" \
    --rpc.laddr "tcp://0.0.0.0:${PORT_RPC}" \
    --api.address "tcp://0.0.0.0:${PORT_REST}" \
    --grpc.address "0.0.0.0:${PORT_GRPC}" \
    --log_level info \
    > "$DATA_DIR/validator${i}.log" 2>&1 &
  echo "  validator$i started (PID $!)"
done

# Seed node (p2p only, port 26700)
$BINARY start \
  --home "$DATA_DIR/seed" \
  --p2p.laddr "tcp://0.0.0.0:26700" \
  --rpc.laddr "tcp://0.0.0.0:26701" \
  --log_level info \
  > "$DATA_DIR/seed.log" 2>&1 &
echo "  seed node started (PID $!)"

# RPC node (public-facing, port 26750)
$BINARY start \
  --home "$DATA_DIR/rpc" \
  --p2p.laddr "tcp://0.0.0.0:26750" \
  --rpc.laddr "tcp://0.0.0.0:26751" \
  --api.address "tcp://0.0.0.0:1320" \
  --grpc.address "0.0.0.0:9094" \
  --log_level info \
  > "$DATA_DIR/rpc.log" 2>&1 &
echo "  rpc node started (PID $!)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Tamizhi Security Chain is running           ║"
echo "║  Chain ID: tamizhi-sec-1                     ║"
echo "║  Token:    TMZ (utmz)                        ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Validator 1 RPC:  http://localhost:26657    ║"
echo "║  Validator 1 REST: http://localhost:1317     ║"
echo "║  Public RPC:       http://localhost:26751    ║"
echo "║  Public REST:      http://localhost:1320     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Stop with: kill \$(pgrep -f tamizhid)"
STARTSCRIPT
chmod +x "$DATA_DIR/start.sh"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Tamizhi localnet ready!                  ║"
echo "║  Chain ID: $CHAIN_ID              ║"
echo "║  Faucet:   $FAUCET_ADDR ║"
echo "║  Monitor:  $MONITOR_ADDR ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Next: $DATA_DIR/start.sh"
