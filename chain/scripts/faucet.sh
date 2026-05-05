#!/usr/bin/env bash
# Simple CLI faucet — sends tokens from the faucet key to a given address.
set -euo pipefail

BINARY="tamizhi"
CHAIN_ID="${CHAIN_ID:-tamizhi-1}"
NODE="${NODE:-http://localhost:26657}"
FAUCET_KEY="${FAUCET_KEY:-faucet}"
FAUCET_AMOUNT="${FAUCET_AMOUNT:-10000000utmz}"  # 10 TMZ per request
KEYRING="--keyring-backend test"
HOME_FLAG="${TAMIZHI_HOME:+--home $TAMIZHI_HOME}"

TO="${1:-}"

if [ -z "$TO" ]; then
  echo "Usage: $0 <recipient-address>"
  exit 1
fi

echo "Sending $FAUCET_AMOUNT to $TO from faucet..."

$BINARY tx bank send "$FAUCET_KEY" "$TO" "$FAUCET_AMOUNT" \
  --chain-id "$CHAIN_ID" \
  --node "$NODE" \
  $KEYRING $HOME_FLAG \
  --gas auto \
  --gas-adjustment 1.4 \
  --fees "5000utmz" \
  --yes

echo "✅ Faucet sent $FAUCET_AMOUNT to $TO"
