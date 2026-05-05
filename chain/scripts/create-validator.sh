#!/usr/bin/env bash
# Creates a new validator after the chain is running.
set -euo pipefail

BINARY="tamizhid"
CHAIN_ID="${CHAIN_ID:-tamizhi-sec-1}"
NODE="${NODE:-http://localhost:26657}"
REST="${REST:-http://localhost:1317}"
KEYRING="--keyring-backend os"

usage() {
  echo "Usage: $0 --key <key-name> --moniker <moniker> --amount <stake-amount>"
  echo "  --key       Key name in keyring (required)"
  echo "  --moniker   Validator moniker   (required)"
  echo "  --amount    Self-delegation amount in utmz (default: 1000000utmz = 1 TMZ)"
  echo "  --commission-rate       (default: 0.10)"
  echo "  --commission-max-rate   (default: 0.20)"
  exit 1
}

KEY=""
MONIKER=""
AMOUNT="1000000utmz"
COMMISSION="0.10"
COMMISSION_MAX="0.20"
COMMISSION_CHANGE="0.01"
MIN_SELF_DEL="1"

while [[ $# -gt 0 ]]; do
  case $1 in
    --key) KEY="$2"; shift 2;;
    --moniker) MONIKER="$2"; shift 2;;
    --amount) AMOUNT="$2"; shift 2;;
    --commission-rate) COMMISSION="$2"; shift 2;;
    --commission-max-rate) COMMISSION_MAX="$2"; shift 2;;
    *) usage;;
  esac
done

[ -z "$KEY" ] || [ -z "$MONIKER" ] && usage

echo "Creating validator '$MONIKER' with key '$KEY'..."

PUBKEY=$($BINARY tendermint show-validator)

$BINARY tx staking create-validator \
  --amount "$AMOUNT" \
  --pubkey "$PUBKEY" \
  --moniker "$MONIKER" \
  --chain-id "$CHAIN_ID" \
  --commission-rate "$COMMISSION" \
  --commission-max-rate "$COMMISSION_MAX" \
  --commission-max-change-rate "$COMMISSION_CHANGE" \
  --min-self-delegation "$MIN_SELF_DEL" \
  --from "$KEY" \
  $KEYRING \
  --node "$NODE" \
  --gas auto \
  --gas-adjustment 1.4 \
  --fees "5000utmz" \
  --yes

echo "✅ Validator '$MONIKER' created successfully"
