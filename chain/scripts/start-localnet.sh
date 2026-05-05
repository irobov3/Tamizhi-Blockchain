#!/bin/bash
set -e

BINARY="./build/tamizhid"
HOME_DIR="$HOME/.tamizhi-localnet"
CHAIN_ID="tamizhi-1"
MONIKER="tamizhi-localnet"
KEY_NAME="validator"
KEYRING="test"

echo "=== Tamizhi L1 Localnet Setup ==="

# Build if needed
if [ ! -f "$BINARY" ]; then
  echo "Building tamizhid..."
  GOFLAGS="-mod=mod" CGO_ENABLED=1 CGO_LDFLAGS="-L$HOME/lib" \
    /Users/guverad/go-sdk/go/bin/go build \
    -ldflags "-r $HOME/lib" \
    -o build/tamizhid ./cmd/tamizhid
  codesign --force --sign - build/tamizhid
fi

# Reset
rm -rf "$HOME_DIR"
echo "Initializing node..."
$BINARY init "$MONIKER" --chain-id "$CHAIN_ID" --home "$HOME_DIR" 2>&1 | tail -3

echo "Creating validator key..."
$BINARY keys add "$KEY_NAME" --keyring-backend "$KEYRING" --home "$HOME_DIR" --output json 2>&1

ADDR=$($BINARY keys show "$KEY_NAME" --keyring-backend "$KEYRING" --home "$HOME_DIR" -a 2>/dev/null)
echo "Validator address: $ADDR"

echo "Adding genesis account..."
$BINARY add-genesis-account "$ADDR" 1000000000000utmz,1000000000stake --home "$HOME_DIR"

echo "Creating genesis transaction..."
$BINARY gentx "$KEY_NAME" 100000000stake \
  --chain-id "$CHAIN_ID" \
  --keyring-backend "$KEYRING" \
  --home "$HOME_DIR" 2>&1 | tail -2

echo "Collecting genesis transactions..."
$BINARY collect-gentxs --home "$HOME_DIR" 2>&1 | tail -3

echo ""
echo "=== Starting Tamizhi L1 Node ==="
echo "RPC: http://localhost:26657"
echo "API: http://localhost:1317"
echo "gRPC: localhost:9090"
echo ""

$BINARY start \
  --home "$HOME_DIR" \
  --minimum-gas-prices 0.025utmz \
  --log_level info
