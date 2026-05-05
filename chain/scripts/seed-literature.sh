#!/usr/bin/env bash
# seed-literature.sh — Broadcast all Tamil literary works from works.json
# as MsgSubmitWork transactions to a running Tamizhi chain.
#
# Usage:
#   ./scripts/seed-literature.sh
#
# Environment overrides:
#   BINARY      — chain binary name (default: tamizhi)
#   CHAIN_ID    — chain identifier  (default: tamizhi-local-1)
#   NODE        — RPC endpoint      (default: http://localhost:26657)
#   FROM        — key name / address (default: validator)
#   GAS_PRICES  — gas price string   (default: 1000utmz)
#   DRY_RUN     — set to "1" to print commands without executing

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BINARY="${BINARY:-tamizhi}"
CHAIN_ID="${CHAIN_ID:-tamizhi-local-1}"
NODE="${NODE:-http://localhost:26657}"
FROM="${FROM:-validator}"
GAS_PRICES="${GAS_PRICES:-1000utmz}"
DRY_RUN="${DRY_RUN:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKS_FILE="${SCRIPT_DIR}/../genesis/literature-seed/works.json"

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not installed. Install with: brew install jq" >&2
  exit 1
fi

if [[ ! -f "$WORKS_FILE" ]]; then
  echo "ERROR: Works file not found at: $WORKS_FILE" >&2
  exit 1
fi

if [[ "$DRY_RUN" != "1" ]] && ! command -v "$BINARY" &>/dev/null; then
  echo "ERROR: Binary '$BINARY' not found in PATH." >&2
  echo "       Set BINARY=<path-to-tamizhi> or ensure the binary is on your PATH." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║          Tamizhi Blockchain — Tamil Literary Seed Script         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Chain   : $CHAIN_ID"
echo "  Node    : $NODE"
echo "  From    : $FROM"
echo "  Binary  : $BINARY"
echo "  DryRun  : $DRY_RUN"
echo "  File    : $WORKS_FILE"
echo ""

# ---------------------------------------------------------------------------
# Count and iterate
# ---------------------------------------------------------------------------
TOTAL=$(jq 'length' "$WORKS_FILE")
echo "  Works to submit: $TOTAL"
echo ""

SUBMITTED=0
FAILED=0
SKIPPED=0
IDX=0

jq -c '.[]' "$WORKS_FILE" | while IFS= read -r work; do
  IDX=$((IDX + 1))

  WORK_ID=$(echo "$work"       | jq -r '.work_id')
  TITLE_EN=$(echo "$work"      | jq -r '.title_english')
  TITLE_TM=$(echo "$work"      | jq -r '.title_tamil')
  AUTHOR=$(echo "$work"        | jq -r '.author')
  WORK_TYPE=$(echo "$work"     | jq -r '.work_type')
  LANGUAGE=$(echo "$work"      | jq -r '.language')
  ERA=$(echo "$work"           | jq -r '.era')
  ANTHOLOGY=$(echo "$work"     | jq -r '.anthology')
  CONTENT_HASH=$(echo "$work"  | jq -r '.content_hash')
  ARWEAVE_ID=$(echo "$work"    | jq -r '.arweave_id // ""')
  DESCRIPTION=$(echo "$work"   | jq -r '.description')

  echo "  [$IDX/$TOTAL] $WORK_ID"
  echo "    Title  : $TITLE_EN"
  echo "    Tamil  : $TITLE_TM"
  echo "    Author : $AUTHOR"
  echo "    Type   : $WORK_TYPE  |  Era: $ERA"

  TX_CMD=(
    "$BINARY" tx literature submit-work
    "$WORK_ID"
    "$AUTHOR"
    "$WORK_TYPE"
    "$LANGUAGE"
    "$CONTENT_HASH"
    "$ARWEAVE_ID"
    --from "$FROM"
    --chain-id "$CHAIN_ID"
    --node "$NODE"
    --gas auto
    --gas-prices "$GAS_PRICES"
    --gas-adjustment 1.3
    --yes
    --output json
  )

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "    [DRY RUN] Would execute: ${TX_CMD[*]}"
    SKIPPED=$((SKIPPED + 1))
  else
    set +e
    TX_OUTPUT=$("${TX_CMD[@]}" 2>/dev/null)
    TX_EXIT=$?
    set -e

    if [[ $TX_EXIT -eq 0 ]] && echo "$TX_OUTPUT" | jq -e '.code == 0' > /dev/null 2>&1; then
      TX_HASH=$(echo "$TX_OUTPUT" | jq -r '.txhash // "unknown"')
      echo "    OK  txhash=$TX_HASH"
      SUBMITTED=$((SUBMITTED + 1))
    else
      # Extract error message if available
      ERR_RAW=$(echo "$TX_OUTPUT" | jq -r '.raw_log // .error // "unknown error"' 2>/dev/null || echo "parse error")
      echo "    FAIL  reason: $ERR_RAW"
      FAILED=$((FAILED + 1))

      # Continue rather than abort — we want to try all works
    fi
  fi

  echo ""

  # Small delay to avoid flooding the mempool
  sleep 0.5
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                          Seed Summary                           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
if [[ "$DRY_RUN" == "1" ]]; then
  echo "  DRY RUN — no transactions were broadcast."
  echo "  Would have submitted: $TOTAL works"
else
  echo "  Total   : $TOTAL"
  echo "  OK      : $SUBMITTED"
  echo "  Failed  : $FAILED"
  if [[ $FAILED -gt 0 ]]; then
    echo ""
    echo "  Re-run with FAILED works only:"
    echo "    BINARY=$BINARY CHAIN_ID=$CHAIN_ID NODE=$NODE FROM=$FROM \\"
    echo "    ./scripts/seed-literature.sh"
  fi
fi
echo ""

# Exit non-zero if any failures occurred
if [[ "$DRY_RUN" != "1" ]] && [[ $FAILED -gt 0 ]]; then
  exit 1
fi
