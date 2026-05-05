#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/prepare-upgrade.sh <upgrade-name> <upgrade-height> [--submit-proposal]
# Example: ./scripts/prepare-upgrade.sh v1.1.0 1000 --submit-proposal

UPGRADE_NAME="${1:-}"
UPGRADE_HEIGHT="${2:-}"
SUBMIT="${3:-}"

if [ -z "$UPGRADE_NAME" ] || [ -z "$UPGRADE_HEIGHT" ]; then
  echo "Usage: $0 <upgrade-name> <upgrade-height> [--submit-proposal]"
  exit 1
fi

BINARY=${BINARY:-tamizhi}
CHAIN_ID=${CHAIN_ID:-tamizhi-local-1}
NODE=${NODE:-http://localhost:26657}
FROM=${FROM:-validator}
DEPOSIT=${DEPOSIT:-10000000utmz}

echo "==> Building upgrade binary for $UPGRADE_NAME..."
make build

echo "==> Installing upgrade binary into Cosmovisor..."
UPGRADE_DIR="$HOME/.tamizhi/cosmovisor/upgrades/$UPGRADE_NAME/bin"
mkdir -p "$UPGRADE_DIR"
cp ./build/tamizhi "$UPGRADE_DIR/tamizhi"
echo "    Binary installed at $UPGRADE_DIR/tamizhi"

if [ "$SUBMIT" = "--submit-proposal" ]; then
  echo "==> Submitting software upgrade governance proposal..."
  $BINARY tx gov submit-proposal \
    --type software-upgrade \
    --title "Upgrade to $UPGRADE_NAME" \
    --description "On-chain upgrade to $UPGRADE_NAME at block $UPGRADE_HEIGHT" \
    --upgrade-name "$UPGRADE_NAME" \
    --upgrade-height "$UPGRADE_HEIGHT" \
    --deposit "$DEPOSIT" \
    --from "$FROM" \
    --chain-id "$CHAIN_ID" \
    --node "$NODE" \
    --yes \
    --output json | jq .
  echo ""
  echo "==> Proposal submitted. Vote with:"
  echo "    $BINARY tx gov vote <proposal-id> yes --from $FROM --chain-id $CHAIN_ID"
fi

echo ""
echo "✓ Upgrade $UPGRADE_NAME is ready."
echo "  Cosmovisor will automatically switch binaries at block $UPGRADE_HEIGHT"
