#!/usr/bin/env bash
# governance-roundtrip.sh — end-to-end governance proposal test
#
# What this script tests (Option E):
#   1. Submit a text governance proposal
#   2. Deposit the minimum deposit amount to reach the deposit threshold
#   3. Vote YES with the validator key (has >2/3 quorum on a single-validator chain)
#   4. Wait for the voting period to close (genesis uses 300s)
#   5. Verify the proposal status is PROPOSAL_STATUS_PASSED
#
# Prerequisites:
#   - tamizhid binary in PATH (or ./ prefix)
#   - chain running: tamizhid start --minimum-gas-prices="0utmz"
#   - validator1 key in keyring (keyring-backend=test)
#
# Usage:
#   bash scripts/governance-roundtrip.sh [--rpc http://localhost:26657] [--home ~/.tamizhid]

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
BINARY="${TAMIZHID_BINARY:-tamizhid}"
CHAIN_ID="${CHAIN_ID:-tamizhi-sec-1}"
RPC="${RPC:-http://localhost:26657}"
HOME_DIR="${HOME_DIR:-$HOME/.tamizhid}"
KEYRING_BACKEND="test"
KEY="${GOV_KEY:-validator1}"
DENOM="utmz"

# Deposit must meet min_deposit from genesis (default 10,000,000 utmz = 10 TMZ)
DEPOSIT="10000000${DENOM}"
# Gas for transactions
GAS_PRICES="0${DENOM}"

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --rpc)    RPC="$2";      shift 2;;
    --home)   HOME_DIR="$2"; shift 2;;
    --key)    KEY="$2";      shift 2;;
    *)        echo "Unknown flag: $1"; exit 1;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
info()  { echo "  [INFO]  $*"; }
ok()    { echo "  [✓]    $*"; }
fail()  { echo "  [✗]    $*" >&2; exit 1; }

wait_for_tx() {
  local txhash="$1"
  local attempts=15
  for i in $(seq 1 $attempts); do
    local result
    result=$(${BINARY} query tx "${txhash}" --node "${RPC}" --output json 2>/dev/null || true)
    local code
    code=$(echo "${result}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code', -1))" 2>/dev/null || echo "-1")
    if [ "${code}" = "0" ]; then return 0; fi
    if [ "${code}" != "-1" ] && [ "${code}" != "" ]; then
      fail "tx ${txhash} failed with code ${code}: $(echo "${result}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('raw_log',''))" 2>/dev/null)"
    fi
    sleep 2
  done
  fail "tx ${txhash} not found after ${attempts} attempts"
}

wait_for_proposal_status() {
  local prop_id="$1"
  local wanted="$2"
  local max_wait="${3:-400}"  # seconds
  info "Waiting up to ${max_wait}s for proposal ${prop_id} to reach ${wanted}..."
  local elapsed=0
  while [ $elapsed -lt $max_wait ]; do
    local status
    status=$(${BINARY} query gov proposal "${prop_id}" \
      --node "${RPC}" --output json 2>/dev/null \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status', d.get('proposal', {}).get('status','')))" 2>/dev/null || echo "")
    if [ "${status}" = "${wanted}" ]; then
      ok "Proposal ${prop_id} reached status: ${status}"
      return 0
    fi
    info "  status=${status} (${elapsed}s elapsed, waiting...)"
    sleep 10
    elapsed=$((elapsed + 10))
  done
  fail "Proposal ${prop_id} did not reach ${wanted} within ${max_wait}s (last status: ${status})"
}

# ── Main ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   Tamizhi Governance Round-Trip Test           ║"
echo "║   Chain: ${CHAIN_ID}                      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check chain is reachable.
info "Checking chain connectivity (${RPC})..."
${BINARY} status --node "${RPC}" > /dev/null 2>&1 || fail "Chain not reachable at ${RPC}. Is tamizhid running?"
ok "Chain is reachable."

# Get proposer address.
PROPOSER=$(${BINARY} keys show "${KEY}" -a \
  --keyring-backend "${KEYRING_BACKEND}" \
  --home "${HOME_DIR}" 2>/dev/null) || fail "Key '${KEY}' not found in keyring"
info "Proposer: ${PROPOSER}"

# ── Step 1: Submit proposal ───────────────────────────────────────────────────
echo ""
echo "── Step 1: Submit text proposal ─────────────────────────────────────────"

PROPOSAL_TITLE="Tamizhi Governance Test Proposal"
PROPOSAL_SUMMARY="Automated end-to-end governance round-trip test. Vote YES to confirm governance works."

# Create proposal JSON (SDK v0.50 format)
PROPOSAL_FILE="/tmp/tamizhi_gov_proposal.json"
cat > "${PROPOSAL_FILE}" <<PROPJSON
{
  "messages": [],
  "metadata": "ipfs://QmTestGovernanceProposalMetadata",
  "deposit": "${DEPOSIT}",
  "title": "${PROPOSAL_TITLE}",
  "summary": "${PROPOSAL_SUMMARY}",
  "expedited": false
}
PROPJSON

info "Submitting proposal with ${DEPOSIT} deposit..."
TX_OUTPUT=$(${BINARY} tx gov submit-proposal "${PROPOSAL_FILE}" \
  --from "${KEY}" \
  --chain-id "${CHAIN_ID}" \
  --node "${RPC}" \
  --keyring-backend "${KEYRING_BACKEND}" \
  --home "${HOME_DIR}" \
  --gas auto \
  --gas-adjustment 1.5 \
  --gas-prices "${GAS_PRICES}" \
  --yes \
  --output json 2>&1) || fail "submit-proposal failed: ${TX_OUTPUT}"

SUBMIT_TXHASH=$(echo "${TX_OUTPUT}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['txhash'])" 2>/dev/null) \
  || fail "Could not parse txhash from: ${TX_OUTPUT}"
info "Submit tx: ${SUBMIT_TXHASH}"
wait_for_tx "${SUBMIT_TXHASH}"
ok "Proposal submitted."

# ── Step 2: Find the proposal ID ─────────────────────────────────────────────
echo ""
echo "── Step 2: Find proposal ID ─────────────────────────────────────────────"
sleep 3
# Fetch the latest proposal (highest ID = newest).
PROPOSAL_ID=$(${BINARY} query gov proposals \
  --node "${RPC}" --output json 2>/dev/null \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
proposals = d.get('proposals', [])
if not proposals:
    print('0')
else:
    # Find highest id
    max_id = max(int(p.get('id', p.get('proposal_id', 0))) for p in proposals)
    print(max_id)
" 2>/dev/null)

if [ "${PROPOSAL_ID}" = "0" ] || [ -z "${PROPOSAL_ID}" ]; then
  fail "Could not find proposal ID after submission"
fi
ok "Proposal ID: ${PROPOSAL_ID}"

# ── Step 3: Verify it is in deposit period ────────────────────────────────────
echo ""
echo "── Step 3: Check proposal is in voting period ────────────────────────────"
# With deposit already provided in submit-proposal, it goes directly to voting.
CURRENT_STATUS=$(${BINARY} query gov proposal "${PROPOSAL_ID}" \
  --node "${RPC}" --output json 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status', d.get('proposal', {}).get('status','')))" 2>/dev/null)
info "Current status: ${CURRENT_STATUS}"

if [ "${CURRENT_STATUS}" = "PROPOSAL_STATUS_DEPOSIT_PERIOD" ]; then
  info "Proposal in deposit period — adding deposit..."
  TX_OUTPUT=$(${BINARY} tx gov deposit "${PROPOSAL_ID}" "${DEPOSIT}" \
    --from "${KEY}" \
    --chain-id "${CHAIN_ID}" \
    --node "${RPC}" \
    --keyring-backend "${KEYRING_BACKEND}" \
    --home "${HOME_DIR}" \
    --gas auto \
    --gas-adjustment 1.5 \
    --gas-prices "${GAS_PRICES}" \
    --yes \
    --output json 2>&1) || fail "deposit failed: ${TX_OUTPUT}"
  DEPOSIT_TXHASH=$(echo "${TX_OUTPUT}" | python3 -c "import sys,json; print(json.load(sys.stdin)['txhash'])")
  wait_for_tx "${DEPOSIT_TXHASH}"
  ok "Deposit tx: ${DEPOSIT_TXHASH}"
fi

# ── Step 4: Vote YES ──────────────────────────────────────────────────────────
echo ""
echo "── Step 4: Vote YES ─────────────────────────────────────────────────────"
sleep 3
TX_OUTPUT=$(${BINARY} tx gov vote "${PROPOSAL_ID}" yes \
  --from "${KEY}" \
  --chain-id "${CHAIN_ID}" \
  --node "${RPC}" \
  --keyring-backend "${KEYRING_BACKEND}" \
  --home "${HOME_DIR}" \
  --gas auto \
  --gas-adjustment 1.5 \
  --gas-prices "${GAS_PRICES}" \
  --yes \
  --output json 2>&1) || fail "vote failed: ${TX_OUTPUT}"

VOTE_TXHASH=$(echo "${TX_OUTPUT}" | python3 -c "import sys,json; print(json.load(sys.stdin)['txhash'])" 2>/dev/null) \
  || fail "Could not parse vote txhash"
info "Vote tx: ${VOTE_TXHASH}"
wait_for_tx "${VOTE_TXHASH}"
ok "Voted YES on proposal ${PROPOSAL_ID}."

# ── Step 5: Verify vote was recorded ─────────────────────────────────────────
echo ""
echo "── Step 5: Verify vote recorded ─────────────────────────────────────────"
sleep 3
VOTE_OPTION=$(${BINARY} query gov vote "${PROPOSAL_ID}" "${PROPOSER}" \
  --node "${RPC}" --output json 2>/dev/null \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
vote = d.get('vote', d)
options = vote.get('options', [])
if options:
    print(options[0].get('option', ''))
else:
    print(vote.get('option', ''))
" 2>/dev/null)
ok "Vote confirmed: ${PROPOSER} voted ${VOTE_OPTION}"

# ── Step 6: Wait for proposal to pass ────────────────────────────────────────
echo ""
echo "── Step 6: Wait for proposal to pass (voting period = 300s) ────────────"
wait_for_proposal_status "${PROPOSAL_ID}" "PROPOSAL_STATUS_PASSED" 400

# ── Step 7: Print tally ───────────────────────────────────────────────────────
echo ""
echo "── Step 7: Final tally ──────────────────────────────────────────────────"
${BINARY} query gov tally "${PROPOSAL_ID}" --node "${RPC}" --output json 2>/dev/null \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
t = d.get('tally', d)
print(f'  YES:        {t.get(\"yes_count\",  t.get(\"yes\",  \"?\"))}')
print(f'  NO:         {t.get(\"no_count\",   t.get(\"no\",   \"?\"))}')
print(f'  ABSTAIN:    {t.get(\"abstain_count\",t.get(\"abstain\",\"?\"))}')
print(f'  NO_VETO:    {t.get(\"no_with_veto_count\",t.get(\"no_with_veto\",\"?\"))}')
" 2>/dev/null || info "Could not fetch tally (proposal already finalized)"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  ✅  Governance round-trip PASSED              ║"
echo "║  Proposal ${PROPOSAL_ID} was submitted, voted, ║"
echo "║  and passed successfully.                      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
