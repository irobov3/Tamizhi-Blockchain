#!/usr/bin/env bash
# Tamizhi Chain End-to-End Smoke Test
# Usage: ./scripts/e2e-smoke-test.sh [binary]
# Requirements: tamizhi binary in PATH or $BINARY env var
set -euo pipefail

BINARY="${BINARY:-tamizhi}"
CHAIN_ID="tamizhi-smoke-1"
HOME_DIR="$(mktemp -d /tmp/tamizhi-smoke-XXXXXX)"
FEES="5000utmz"
NODE_PID=""

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; ((PASS++)); }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; ((FAIL++)); }
info() { echo -e "${YELLOW}▶${NC}  $1"; }

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
    info "Stopping node (PID $NODE_PID)..."
    kill "$NODE_PID" 2>/dev/null || true
    wait "$NODE_PID" 2>/dev/null || true
  fi
  rm -rf "$HOME_DIR"
  echo ""
  echo "Results: ${PASS} passed, ${FAIL} failed"
  [ "$FAIL" -eq 0 ]
}
trap cleanup EXIT

# ── Init ──────────────────────────────────────────────────────────────────────
info "Initializing chain in $HOME_DIR"
$BINARY init smoke-validator --chain-id "$CHAIN_ID" --home "$HOME_DIR" 2>/dev/null

# Create validator key
$BINARY keys add validator --keyring-backend test --home "$HOME_DIR" 2>/dev/null
VAL_ADDR=$($BINARY keys show validator --keyring-backend test --home "$HOME_DIR" -a)

# Create a regular user key for testing
$BINARY keys add alice --keyring-backend test --home "$HOME_DIR" 2>/dev/null
ALICE_ADDR=$($BINARY keys show alice --keyring-backend test --home "$HOME_DIR" -a)

# Genesis setup
$BINARY genesis add-genesis-account "$VAL_ADDR" 1000000000000utmz --home "$HOME_DIR"
$BINARY genesis add-genesis-account "$ALICE_ADDR" 100000000utmz --home "$HOME_DIR"
$BINARY genesis gentx validator 500000000000utmz \
  --chain-id "$CHAIN_ID" \
  --keyring-backend test \
  --home "$HOME_DIR" 2>/dev/null
$BINARY genesis collect-gentxs --home "$HOME_DIR" 2>/dev/null

# Configure for fast local testing
$BINARY config set client chain-id "$CHAIN_ID" --home "$HOME_DIR"
$BINARY config set client keyring-backend test --home "$HOME_DIR"
$BINARY config set client node tcp://localhost:26657 --home "$HOME_DIR"

# Fast block times for smoke test
sed -i.bak 's/timeout_commit = "5s"/timeout_commit = "500ms"/' "$HOME_DIR/config/config.toml"
sed -i.bak 's/timeout_propose = "3s"/timeout_propose = "500ms"/' "$HOME_DIR/config/config.toml"

# ── Start node ────────────────────────────────────────────────────────────────
info "Starting node..."
$BINARY start \
  --home "$HOME_DIR" \
  --log_level error \
  --rpc.laddr tcp://localhost:26657 \
  --p2p.laddr tcp://localhost:26656 \
  --grpc.address localhost:9090 \
  --api.address tcp://localhost:1317 \
  --api.enable true \
  --grpc.enable true \
  > "$HOME_DIR/node.log" 2>&1 &
NODE_PID=$!

# Wait for first block
info "Waiting for first block..."
for i in $(seq 1 30); do
  if $BINARY query block --home "$HOME_DIR" 2>/dev/null | grep -q '"height"'; then
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "Node failed to start. Log:"
    tail -20 "$HOME_DIR/node.log"
    exit 1
  fi
done

# Wait for block 3 (gives time for all modules to initialize)
info "Waiting for block 3..."
for i in $(seq 1 30); do
  HEIGHT=$($BINARY query block --home "$HOME_DIR" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('block',{}).get('header',{}).get('height','0'))" 2>/dev/null || echo "0")
  if [ "$HEIGHT" -ge 3 ] 2>/dev/null; then break; fi
  sleep 1
done
info "At block height: $HEIGHT"

# ── Helper functions ──────────────────────────────────────────────────────────
tx() {
  $BINARY tx "$@" \
    --home "$HOME_DIR" \
    --fees "$FEES" \
    --yes \
    --output json \
    2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('txhash',''))"
}

query() {
  $BINARY query "$@" --home "$HOME_DIR" --output json 2>/dev/null
}

wait_tx() {
  local txhash="$1"
  for i in $(seq 1 15); do
    RESULT=$(query tx "$txhash" 2>/dev/null || echo "")
    if echo "$RESULT" | grep -q '"code":0'; then
      return 0
    elif echo "$RESULT" | grep -q '"code":[1-9]'; then
      echo "TX failed: $RESULT"
      return 1
    fi
    sleep 1
  done
  return 1
}

# ── Test 1: Chain health ───────────────────────────────────────────────────────
info "Test 1: Chain health"
STATUS=$(query status 2>/dev/null || echo "")
if echo "$STATUS" | grep -q '"latest_block_height"'; then
  pass "Chain is producing blocks"
else
  fail "Chain health check failed"
fi

# ── Test 2: Rewards — create rule ─────────────────────────────────────────────
info "Test 2: Rewards module — CreateRewardRule"
TXHASH=$(tx rewards create-rule \
  --rule-id "smoke-rule" \
  --activity "smoke-test" \
  --amount "1000000utmz" \
  --description "Smoke test reward rule" \
  --max-per-day 10 \
  --from validator 2>/dev/null || echo "")

if [ -n "$TXHASH" ] && wait_tx "$TXHASH" 2>/dev/null; then
  RULES=$(query rewards list-rules 2>/dev/null || echo "{}")
  if echo "$RULES" | grep -q "smoke-rule"; then
    pass "Rewards: CreateRewardRule + ListRewardRules"
  else
    fail "Rewards: Rule created but not found in query"
  fi
else
  fail "Rewards: CreateRewardRule transaction failed (TXHASH=$TXHASH)"
fi

# ── Test 3: Accesslog — log access ───────────────────────────────────────────
info "Test 3: Accesslog module — LogAccess"
TXHASH=$(tx accesslog log-access \
  --employee-id "emp001" \
  --file-hash "$(printf 'a%.0s' {1..64})" \
  --file-name "test.txt" \
  --action "READ" \
  --ipfs-cid "QmTest123" \
  --from validator 2>/dev/null || echo "")

if [ -n "$TXHASH" ] && wait_tx "$TXHASH" 2>/dev/null; then
  LOGS=$(query accesslog logs-by-employee emp001 2>/dev/null || echo "{}")
  if echo "$LOGS" | grep -q "emp001"; then
    pass "Accesslog: LogAccess + GetLogsByEmployee"
  else
    fail "Accesslog: Log created but not found in query"
  fi
else
  fail "Accesslog: LogAccess transaction failed"
fi

# ── Test 4: Security — raise threat flag ─────────────────────────────────────
info "Test 4: Security module — RaiseThreatFlag"
TXHASH=$(tx security raise-threat-flag \
  --employee-id "emp-bad" \
  --address "$ALICE_ADDR" \
  --threat-type "SUSPICIOUS_LOGIN" \
  --level "MEDIUM" \
  --description "Smoke test threat" \
  --from validator 2>/dev/null || echo "")

if [ -n "$TXHASH" ] && wait_tx "$TXHASH" 2>/dev/null; then
  THREATS=$(query security list-threats 2>/dev/null || echo "{}")
  if echo "$THREATS" | grep -q "emp-bad"; then
    pass "Security: RaiseThreatFlag + ListActiveThreatFlags"
  else
    fail "Security: Threat created but not found in query"
  fi
else
  fail "Security: RaiseThreatFlag transaction failed"
fi

# ── Test 5: Messaging — register session ─────────────────────────────────────
info "Test 5: Messaging module — RegisterSession"
TXHASH=$(tx messaging register-session \
  --session-pub-key "$(echo -n 'test-pubkey' | base64)" \
  --display-name "Smoke Test User" \
  --from alice 2>/dev/null || echo "")

if [ -n "$TXHASH" ] && wait_tx "$TXHASH" 2>/dev/null; then
  SESSION=$(query messaging session "$ALICE_ADDR" 2>/dev/null || echo "{}")
  if echo "$SESSION" | grep -q "$ALICE_ADDR"; then
    pass "Messaging: RegisterSession + GetSessionID"
  else
    fail "Messaging: Session created but not found in query"
  fi
else
  fail "Messaging: RegisterSession transaction failed"
fi

# ── Test 6: Nodes — register node ────────────────────────────────────────────
info "Test 6: Nodes module — RegisterNode"
TXHASH=$(tx nodes register-node \
  --node-id "smoke-node-001" \
  --endpoint "https://smoke.tamizhi.ai:443" \
  --stake "15000000000utmz" \
  --from validator 2>/dev/null || echo "")

if [ -n "$TXHASH" ] && wait_tx "$TXHASH" 2>/dev/null; then
  NODE=$(query nodes node "smoke-node-001" 2>/dev/null || echo "{}")
  if echo "$NODE" | grep -q "smoke-node-001"; then
    pass "Nodes: RegisterNode + GetNode"
  else
    fail "Nodes: Node registered but not found in query"
  fi
else
  fail "Nodes: RegisterNode transaction failed"
fi

# ── Test 7: REST API ──────────────────────────────────────────────────────────
info "Test 7: REST API endpoints"
sleep 2
RULES_REST=$(curl -sf "http://localhost:1317/tamizhi/rewards/v1/rules" 2>/dev/null || echo "")
if echo "$RULES_REST" | grep -q "rules\|smoke-rule\|\[\]"; then
  pass "REST API: /tamizhi/rewards/v1/rules reachable"
else
  fail "REST API: /tamizhi/rewards/v1/rules not reachable (response: $RULES_REST)"
fi

NODES_REST=$(curl -sf "http://localhost:1317/tamizhi/nodes/v1/nodes" 2>/dev/null || echo "")
if echo "$NODES_REST" | grep -q "nodes\|smoke-node\|\[\]"; then
  pass "REST API: /tamizhi/nodes/v1/nodes reachable"
else
  fail "REST API: /tamizhi/nodes/v1/nodes not reachable"
fi

echo ""
echo "══════════════════════════════════════"
echo " Smoke Test Results"
echo "══════════════════════════════════════"
echo -e " ${GREEN}Passed${NC}: $PASS"
echo -e " ${RED}Failed${NC}: $FAIL"
echo "══════════════════════════════════════"
