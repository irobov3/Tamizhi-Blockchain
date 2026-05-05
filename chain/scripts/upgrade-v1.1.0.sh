#!/usr/bin/env bash
# Submit a software upgrade governance proposal for v1.1.0
# Usage: ./scripts/upgrade-v1.1.0.sh <upgrade-height> [chain-id] [from-key]
set -euo pipefail

UPGRADE_HEIGHT="${1:-1000}"
CHAIN_ID="${2:-tamizhi-testnet-1}"
FROM="${3:-validator}"
BINARY="${BINARY:-tamizhi}"
FEES="5000utmz"

echo "=== Submitting v1.1.0 upgrade proposal ==="
echo "  upgrade height : $UPGRADE_HEIGHT"
echo "  chain id       : $CHAIN_ID"

$BINARY tx upgrade software-upgrade "v1.1.0" \
  --upgrade-height "$UPGRADE_HEIGHT" \
  --upgrade-info '{"binaries":{"linux/amd64":"https://github.com/tamizhi/chain/releases/download/v1.1.0/tamizhi_linux_amd64"}}' \
  --title "Upgrade to v1.1.0 - Node Slashing & Identity Hardening" \
  --summary "This upgrade adds automated node slashing for low uptime scores and identity hardening with deactivation support." \
  --deposit "10000000utmz" \
  --from "$FROM" \
  --chain-id "$CHAIN_ID" \
  --fees "$FEES" \
  --yes

echo ""
echo "=== Proposal submitted! Vote with: ==="
echo "  $BINARY tx gov vote <proposal-id> yes --from $FROM --chain-id $CHAIN_ID --fees $FEES --yes"
