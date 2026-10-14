#!/usr/bin/env bash
# run-all.sh — Run all Tamizhi k6 load-test scenarios and generate a report.
#
# Usage:
#   ./load-tests/run-all.sh
#
# Environment overrides:
#   REST_URL   – chain REST endpoint  (default: http://localhost:1317)
#   RPC_URL    – chain RPC endpoint   (default: http://localhost:26657)
#   K6_CMD     – path / alias to k6  (default: k6)
#   NODE_CMD   – path / alias to node (default: node)
#
# The script must be run from the repository root (chain/).

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="load-tests/reports/${TIMESTAMP}"
K6_CMD="${K6_CMD:-k6}"
NODE_CMD="${NODE_CMD:-node}"
REST_URL="${REST_URL:-http://localhost:1317}"
RPC_URL="${RPC_URL:-http://localhost:26657}"

SCENARIOS_DIR="load-tests/k6/scenarios"

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
echo "==> Tamizhi chain load test harness"
echo "    Timestamp : ${TIMESTAMP}"
echo "    REST URL  : ${REST_URL}"
echo "    RPC URL   : ${RPC_URL}"
echo ""

if ! command -v "${K6_CMD}" &>/dev/null; then
  echo "ERROR: '${K6_CMD}' not found. Install k6: https://k6.io/docs/get-started/installation/"
  exit 1
fi

# Verify chain is reachable before spending time on tests
echo "==> Checking chain availability..."
if ! curl -sf "${REST_URL}/cosmos/base/tendermint/v1beta1/blocks/latest" \
     -o /dev/null --max-time 5; then
  echo "ERROR: Chain REST endpoint (${REST_URL}) is not reachable."
  echo "       Start localnet first: make localnet-start"
  exit 1
fi
echo "    Chain is up."
echo ""

mkdir -p "${REPORT_DIR}"

# ---------------------------------------------------------------------------
# Helper: run a single scenario
# ---------------------------------------------------------------------------
run_scenario() {
  local name="$1"
  local script="$2"
  local summary_file="${REPORT_DIR}/${name}-summary.json"

  echo "==> Running scenario: ${name}"
  echo "    Script: ${script}"

  if "${K6_CMD}" run \
      --env REST_URL="${REST_URL}" \
      --env RPC_URL="${RPC_URL}" \
      --env CHAIN_ID="${CHAIN_ID:-tamizhi-local-1}" \
      --summary-export="${summary_file}" \
      "${script}"; then
    echo "    [PASS] ${name}"
  else
    # k6 exits non-zero when thresholds fail — record but continue
    echo "    [THRESHOLD BREACH] ${name} — check ${summary_file} for details"
  fi
  echo ""
}

# ---------------------------------------------------------------------------
# Run scenarios
# ---------------------------------------------------------------------------
run_scenario "issue-rewards" "${SCENARIOS_DIR}/issue-rewards.js"
run_scenario "read-heavy"    "${SCENARIOS_DIR}/read-heavy.js"
run_scenario "spike-test"    "${SCENARIOS_DIR}/spike-test.js"

# ---------------------------------------------------------------------------
# Generate combined Markdown report
# ---------------------------------------------------------------------------
echo "==> Generating combined performance report..."

if command -v "${NODE_CMD}" &>/dev/null; then
  "${NODE_CMD}" load-tests/generate-report.js "${REPORT_DIR}" \
    > "${REPORT_DIR}/REPORT.md"
  echo ""
  echo "========================================================"
  echo "  Load test complete."
  echo "  Report : ${REPORT_DIR}/REPORT.md"
  echo "  JSONs  : ${REPORT_DIR}/"
  echo "========================================================"
else
  echo "WARNING: '${NODE_CMD}' not found — skipping Markdown report generation."
  echo "         Raw JSON summaries are in ${REPORT_DIR}/"
fi
