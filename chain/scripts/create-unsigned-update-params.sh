#!/usr/bin/env bash
# Creates an unsigned MsgUpdateRewardParams tx ready for multisig signing
# Usage: ./create-unsigned-update-params.sh <max-daily> <min-amount> <denom>

BINARY=${BINARY:-tamizhi}
CHAIN_ID=${CHAIN_ID:-tamizhi-testnet-1}
ADMIN_ADDR=${ADMIN_ADDR:-$(tamizhi keys show tamizhi-admin --address --keyring-backend file)}
NODE=${NODE:-http://localhost:26657}

MAX_DAILY="${1:-10}"
MIN_AMOUNT="${2:-1000000}"
DENOM="${3:-utmz}"

echo "Creating unsigned UpdateRewardParams transaction..."
echo "  Authority: $ADMIN_ADDR"
echo "  Max daily: $MAX_DAILY"
echo "  Min amount: $MIN_AMOUNT $DENOM"

$BINARY tx rewards update-reward-params \
  --authority "$ADMIN_ADDR" \
  --max-daily-reward "$MAX_DAILY" \
  --min-reward-amount "$MIN_AMOUNT" \
  --reward-denom "$DENOM" \
  --from tamizhi-admin \
  --chain-id "$CHAIN_ID" \
  --node "$NODE" \
  --gas 200000 \
  --gas-prices 1000utmz \
  --generate-only > unsigned_update_params.json

echo "Unsigned tx saved to unsigned_update_params.json"
echo "Distribute to signers and collect 3 signatures."
