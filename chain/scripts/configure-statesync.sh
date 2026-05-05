#!/usr/bin/env bash
# Configure state sync for fast node bootstrapping
# Usage: ./scripts/configure-statesync.sh [chain-home] [rpc-server]

set -euo pipefail

CHAIN_HOME="${1:-$HOME/.tamizhi}"
RPC_SERVER="${2:-http://rpc1.testnet.tamizhi.ai:26657,http://rpc2.testnet.tamizhi.ai:26657}"
BINARY="${BINARY:-tamizhi}"
CHAIN_ID="${CHAIN_ID:-tamizhi-testnet-1}"

echo "==> Configuring state sync"
echo "    Home:       $CHAIN_HOME"
echo "    RPC server: $RPC_SERVER"
echo ""

# Get a trusted block hash and height from 1000 blocks ago
LATEST_HEIGHT=$(curl -s "${RPC_SERVER%%,*}/block" | jq -r '.result.block.header.height')
if [ -z "$LATEST_HEIGHT" ] || [ "$LATEST_HEIGHT" = "null" ]; then
    echo "ERROR: Could not fetch latest height from $RPC_SERVER"
    exit 1
fi

TRUST_HEIGHT=$((LATEST_HEIGHT - 1000))
TRUST_HASH=$(curl -s "${RPC_SERVER%%,*}/block?height=$TRUST_HEIGHT" | jq -r '.result.block_id.hash')

if [ -z "$TRUST_HASH" ] || [ "$TRUST_HASH" = "null" ]; then
    echo "ERROR: Could not fetch block hash at height $TRUST_HEIGHT"
    exit 1
fi

echo "    Trust height: $TRUST_HEIGHT"
echo "    Trust hash:   $TRUST_HASH"
echo ""

CONFIG_TOML="$CHAIN_HOME/config/config.toml"
APP_TOML="$CHAIN_HOME/config/app.toml"

if [ ! -f "$CONFIG_TOML" ]; then
    echo "ERROR: $CONFIG_TOML not found. Run '$BINARY init' first."
    exit 1
fi

# Update config.toml [statesync] section
sed -i.bak \
    -e "s|^enable = false|enable = true|" \
    -e "s|^rpc_servers = \"\"|rpc_servers = \"$RPC_SERVER\"|" \
    -e "s|^trust_height = 0|trust_height = $TRUST_HEIGHT|" \
    -e "s|^trust_hash = \"\"|trust_hash = \"$TRUST_HASH\"|" \
    -e "s|^trust_period = \"168h0m0s\"|trust_period = \"336h0m0s\"|" \
    "$CONFIG_TOML"

# Update app.toml [state-sync] section
sed -i.bak \
    -e "s|^snapshot-interval = 0|snapshot-interval = 1000|" \
    -e "s|^snapshot-keep-recent = 2|snapshot-keep-recent = 5|" \
    "$APP_TOML"

echo "✓ config.toml updated"
echo "✓ app.toml updated"
echo ""
echo "==> State sync configured. Start your node with:"
echo "    $BINARY start --home $CHAIN_HOME"
echo ""
echo "The node will sync from block $TRUST_HEIGHT (~$((LATEST_HEIGHT - TRUST_HEIGHT)) blocks via state sync)"
