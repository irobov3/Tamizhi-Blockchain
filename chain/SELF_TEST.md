# Tamizhi Solo Self-Test Runbook

> Goal: validate the entire stack on your own machine before any public launch.
> Time required: ~3 hours active testing, plus 24h fuzz overnight.

You are testing as a single developer. None of this requires external validators,
auditors, or community involvement.

---

## Phase 0 — Pre-Flight (5 minutes)

Just confirm everything still builds and tests cleanly.

```bash
cd /Users/guverad/Desktop/Tamizhi.Ai/chain

# Build everything
CGO_ENABLED=0 /Users/guverad/go-sdk/go/bin/go build ./...

# Run all tests
make test
```

**Pass criteria:** zero build errors, 17/17 packages PASS.

---

## Phase 1 — Build the Binary (10 minutes)

Produce the actual `tamizhi` binary you'd ship.

```bash
make build
ls -lh build/tamizhi

# Sanity check
./build/tamizhi version
./build/tamizhi --help | head -30
```

**Pass criteria:** `tamizhi` binary exists, version prints, all module commands listed.

---

## Phase 2 — Localnet Boot (15 minutes)

Start a single-validator localnet and watch blocks produce.

```bash
# Reset any previous state
rm -rf ~/.tamizhi-self-test

# Initialize a fresh node
./build/tamizhi init self-test-node --chain-id tamizhi-self-1 --home ~/.tamizhi-self-test

# Create a validator key
./build/tamizhi keys add validator --keyring-backend test --home ~/.tamizhi-self-test
./build/tamizhi keys add alice     --keyring-backend test --home ~/.tamizhi-self-test
./build/tamizhi keys add bob       --keyring-backend test --home ~/.tamizhi-self-test

# Add genesis accounts (each gets 1 million TMZ)
VALIDATOR=$(./build/tamizhi keys show validator -a --keyring-backend test --home ~/.tamizhi-self-test)
ALICE=$(./build/tamizhi keys show alice -a --keyring-backend test --home ~/.tamizhi-self-test)
BOB=$(./build/tamizhi keys show bob -a --keyring-backend test --home ~/.tamizhi-self-test)

./build/tamizhi genesis add-genesis-account "$VALIDATOR" 1000000000000utmz --home ~/.tamizhi-self-test
./build/tamizhi genesis add-genesis-account "$ALICE"     1000000000000utmz --home ~/.tamizhi-self-test
./build/tamizhi genesis add-genesis-account "$BOB"       1000000000000utmz --home ~/.tamizhi-self-test

# Create the gentx (validator self-delegation)
./build/tamizhi genesis gentx validator 100000000000utmz \
    --chain-id tamizhi-self-1 \
    --keyring-backend test \
    --home ~/.tamizhi-self-test

./build/tamizhi genesis collect-gentxs --home ~/.tamizhi-self-test
./build/tamizhi genesis validate --home ~/.tamizhi-self-test

# Start the node (runs in background)
./build/tamizhi start --home ~/.tamizhi-self-test --minimum-gas-prices 1000utmz \
    > /tmp/tamizhi-self.log 2>&1 &
echo "Node PID: $!"

# Wait 15 seconds for blocks to start
sleep 15

# Verify it's producing blocks
curl -s http://localhost:26657/status | jq '.result.sync_info.latest_block_height'
```

**Pass criteria:** block height increments every ~5 seconds.

If the height shows e.g. `"3"` then `"6"` then `"9"` ✓ blocks are producing.

---

## Phase 3 — Module Smoke Tests (30 minutes)

Test each custom module end-to-end using the CLI you wrote.

### 3.1 Bank transfer (sanity)
```bash
./build/tamizhi tx bank send "$ALICE" "$BOB" 1000000utmz \
    --keyring-backend test --home ~/.tamizhi-self-test \
    --chain-id tamizhi-self-1 --gas auto --gas-prices 1000utmz \
    --gas-adjustment 1.3 --yes

sleep 6
./build/tamizhi query bank balances "$BOB" --home ~/.tamizhi-self-test
```
**Expected:** Bob's balance increased by 1 TMZ.

### 3.2 Rewards module
```bash
# Create a reward rule
./build/tamizhi tx rewards create-reward-rule \
    "rule-test-001" "Test Rule" 5000000 utmz 10 \
    --from validator --keyring-backend test --home ~/.tamizhi-self-test \
    --chain-id tamizhi-self-1 --gas auto --gas-prices 1000utmz \
    --gas-adjustment 1.3 --yes

sleep 6

# Issue a reward
./build/tamizhi tx rewards issue-reward \
    "emp-test-001" "rule-test-001" \
    --from validator --keyring-backend test --home ~/.tamizhi-self-test \
    --chain-id tamizhi-self-1 --gas auto --gas-prices 1000utmz \
    --gas-adjustment 1.3 --yes

sleep 6

# Query the records
./build/tamizhi query rewards get-reward-record emp-test-001 --home ~/.tamizhi-self-test
```
**Expected:** record shows 5 TMZ issued for rule-test-001.

### 3.3 Nodes module
```bash
./build/tamizhi tx nodes register-node \
    "node-test-001" "https://node1.test:26656" 15000000000utmz "swarm-1" \
    --from validator --keyring-backend test --home ~/.tamizhi-self-test \
    --chain-id tamizhi-self-1 --gas auto --gas-prices 1000utmz \
    --gas-adjustment 1.3 --yes

sleep 6
./build/tamizhi query nodes list-active-nodes --home ~/.tamizhi-self-test
./build/tamizhi query nodes get-node node-test-001 --home ~/.tamizhi-self-test
```
**Expected:** node-test-001 listed with 15,000 TMZ stake.

### 3.4 Literature module
```bash
./build/tamizhi tx literature submit-work \
    "thirukkural-test" "Thiruvalluvar" "poem" "tamil" \
    "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd" \
    "" \
    --from validator --keyring-backend test --home ~/.tamizhi-self-test \
    --chain-id tamizhi-self-1 --gas auto --gas-prices 1000utmz \
    --gas-adjustment 1.3 --yes

sleep 6
./build/tamizhi query literature get-work thirukkural-test --home ~/.tamizhi-self-test
./build/tamizhi query literature list-works --home ~/.tamizhi-self-test
```
**Expected:** the work appears in the list with verified status.

### 3.5 Access log
```bash
./build/tamizhi tx accesslog log-access \
    "emp-test-001" "report.pdf" \
    "deadbeefcafebabe1234567890abcdef1234567890abcdef1234567890abcdef" \
    "view" "QmTest123" \
    --from validator --keyring-backend test --home ~/.tamizhi-self-test \
    --chain-id tamizhi-self-1 --gas auto --gas-prices 1000utmz \
    --gas-adjustment 1.3 --yes

sleep 6
./build/tamizhi query accesslog get-logs-by-employee emp-test-001 --home ~/.tamizhi-self-test
```
**Expected:** one entry with action="view".

### 3.6 Security module (test the blocklist!)
```bash
# Block an address
./build/tamizhi tx security block-address \
    "$BOB" "Suspicious activity" \
    --from validator --keyring-backend test --home ~/.tamizhi-self-test \
    --chain-id tamizhi-self-1 --gas auto --gas-prices 1000utmz \
    --gas-adjustment 1.3 --yes

sleep 6

# Confirm bob is blocked
./build/tamizhi query security is-blocked "$BOB" --home ~/.tamizhi-self-test

# CRITICAL TEST: try to send from bob — should fail
./build/tamizhi tx bank send "$BOB" "$ALICE" 100000utmz \
    --keyring-backend test --home ~/.tamizhi-self-test \
    --chain-id tamizhi-self-1 --gas auto --gas-prices 1000utmz \
    --gas-adjustment 1.3 --yes 2>&1 | grep -i "block\|reject\|denied"
```
**Expected:** the send fails with a "blocked" error → ante handler is enforcing the blocklist correctly.

---

## Phase 4 — REST API Sanity (10 minutes)

```bash
# These should all return 200 with JSON
curl -s http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest | jq '.block.header.height'
curl -s http://localhost:1317/tamizhi/rewards/v1/rules | jq
curl -s http://localhost:1317/tamizhi/nodes/v1/nodes | jq
curl -s http://localhost:1317/tamizhi/nodes/v1/apr | jq
curl -s http://localhost:1317/tamizhi/literature/v1/works | jq
curl -s http://localhost:1317/tamizhi/feeburn/v1/stats | jq
```
**Expected:** all return JSON, no 404s.

---

## Phase 5 — Fee Burn Verification (5 minutes)

```bash
# Get burn stats before
BURNED_BEFORE=$(curl -s http://localhost:1317/tamizhi/feeburn/v1/stats | jq -r '.stats.total_burned[0].amount // "0"')

# Send a few txs to generate fees
for i in 1 2 3; do
    ./build/tamizhi tx bank send "$VALIDATOR" "$ALICE" 1000000utmz \
        --keyring-backend test --home ~/.tamizhi-self-test \
        --chain-id tamizhi-self-1 --gas 200000 --gas-prices 1000utmz \
        --yes > /dev/null 2>&1
    sleep 6
done

# Get burn stats after
BURNED_AFTER=$(curl -s http://localhost:1317/tamizhi/feeburn/v1/stats | jq -r '.stats.total_burned[0].amount // "0"')

echo "Before: $BURNED_BEFORE utmz"
echo "After:  $BURNED_AFTER utmz"
echo "Burned: $((BURNED_AFTER - BURNED_BEFORE)) utmz"
```
**Expected:** burned amount > 0 — confirms 20% of fees are being burned.

---

## Phase 6 — Apps & Services (45 minutes)

### 6.1 Block Explorer
```bash
cd /Users/guverad/Desktop/Tamizhi.Ai/explorer

# Start postgres + indexer + API
docker-compose -f docker-compose.explorer.yml up -d

# Wait for indexer to catch up
sleep 30

# Test the API
curl -s http://localhost:3001/api/v1/stats | jq
curl -s http://localhost:3001/api/v1/blocks?limit=5 | jq
curl -s http://localhost:3001/health
```
**Expected:** stats show non-zero block count, blocks list returns latest.

### 6.2 Wallet Frontend
```bash
cd /Users/guverad/Desktop/Tamizhi.Ai/apps/wallet

# Install if not done
[ -d node_modules ] || npm install

# Run dev server
npm run dev
```
- Open `http://localhost:3000` in your browser
- Install Keplr extension if you don't have it
- Add a custom chain config (chain-id `tamizhi-self-1`, RPC `http://localhost:26657`, denom `utmz`)
- Import the `validator` mnemonic from `~/.tamizhi-self-test`
- ✓ Verify: balance shows, send TMZ works, dashboard loads stats

### 6.3 Literature Browser
```bash
cd /Users/guverad/Desktop/Tamizhi.Ai/apps/literature
[ -d node_modules ] || npm install
npm run dev -- -p 3001
```
- Open `http://localhost:3001`
- ✓ Verify: browse page loads, the work you submitted in 3.4 appears

### 6.4 WebSocket Relay
```bash
cd /Users/guverad/Desktop/Tamizhi.Ai/services/ws-relay
[ -d node_modules ] || npm install
npm run dev &

# In another terminal — send a tx and watch for the live event
wscat -c ws://localhost:3002
# (you'll see incoming events as txs land)
```

---

## Phase 7 — Stress / Performance (30 minutes)

```bash
cd /Users/guverad/Desktop/Tamizhi.Ai/chain

# Install k6 if not present
which k6 || brew install k6  # or: sudo apt install k6

# Run all 3 load test scenarios
REST_URL=http://localhost:1317 \
RPC_URL=http://localhost:26657 \
./load-tests/run-all.sh
```
**Pass criteria:** 
- p95 latency < 8s under 50 VUs
- Error rate < 5%
- Block production never stalls during the spike test

---

## Phase 8 — 24h Fuzz Run (overnight)

Leave this running on your machine overnight:

```bash
cd /Users/guverad/Desktop/Tamizhi.Ai/chain

# Pick the highest-value targets and run them in parallel screens/tmux
mkdir -p /tmp/fuzz-results

# Terminal 1
CGO_ENABLED=0 /Users/guverad/go-sdk/go/bin/go test \
    -fuzz=FuzzMsgIssueReward_ValidateBasic \
    -fuzztime=8h ./x/rewards/types/ > /tmp/fuzz-results/rewards.log 2>&1 &

# Terminal 2
CGO_ENABLED=0 /Users/guverad/go-sdk/go/bin/go test \
    -fuzz=FuzzWorkContent_ValidateHexHash \
    -fuzztime=8h ./x/literature/types/ > /tmp/fuzz-results/literature.log 2>&1 &

# Terminal 3
CGO_ENABLED=0 /Users/guverad/go-sdk/go/bin/go test \
    -fuzz=FuzzMsgRegisterNode_ValidateBasic \
    -fuzztime=8h ./x/nodes/types/ > /tmp/fuzz-results/nodes.log 2>&1 &

# Check in the morning
tail /tmp/fuzz-results/*.log
```
**Pass criteria:** zero crash files in `testdata/fuzz/`. If any appear, you've found a real bug to fix.

---

## Phase 9 — Cleanup & Document Findings (15 minutes)

```bash
# Stop everything
pkill -f "tamizhi start" || true
docker-compose -f /Users/guverad/Desktop/Tamizhi.Ai/explorer/docker-compose.explorer.yml down

# Optional: keep the data for re-runs, or wipe:
# rm -rf ~/.tamizhi-self-test
```

Write your findings to `SELF_TEST_RESULTS.md`:
```markdown
# Self-Test Results — [Date]

## Summary
- Phase 0-9 complete: ✓ / ✗
- Bugs found: [list]
- Performance baseline: [TPS, p95, etc.]

## Notes for Public Launch
- [...]
```

---

## ✅ Solo Test → Public Launch Decision Tree

```
All phases pass + zero fuzz crashes overnight?
    │
    ├── YES → You can confidently:
    │         • Deploy a public testnet RPC
    │         • Open the validator recruitment thread
    │         • Engage the security audit firm
    │
    └── NO  → Fix the failures, re-run the affected phase
```

**You are not waiting on anyone.** Every phase here is solo. The external work
(audit, validators, legal) only kicks in AFTER your self-test is green.
