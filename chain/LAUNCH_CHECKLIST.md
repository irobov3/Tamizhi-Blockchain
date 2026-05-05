# Tamizhi Blockchain — Mainnet Launch Checklist

## Overview
This checklist must be completed before mainnet launch. Each item requires sign-off from at least 2 team members.

Legend: ✅ Complete | 🔄 In Progress | ❌ Blocked | ⏳ Pending

---

## TIER 1 — Hard Blockers (ALL must be ✅ before launch)

### 1.1 Chain Core
- [ ] All module unit tests pass (`go test ./x/...`)
- [ ] Fuzz tests run for minimum 24h with no findings
- [ ] Benchmark regression: no p95 above baseline
- [ ] `tamizhi genesis validate` passes on mainnet genesis.json
- [ ] Upgrade handler v1.0.0 tested on testnet (state migration clean)
- [ ] CosmWasm contracts audited and WASM binaries checksummed

### 1.2 Security
- [ ] Security audit report signed off (all Critical/High findings resolved)
- [ ] Ante handler: blocklist, rate-limit, fee-burn all tested under load
- [ ] Node slashing tested: jailing triggers correctly at UptimeScore < 20
- [ ] IBC middleware: tested with cross-chain transfers, logs correctly
- [ ] No private keys committed to git history (`git log --all -S 'key' -- '*.json'`)
- [ ] Dependency audit: `go mod tidy && go mod verify` clean
- [ ] Docker images scanned (Trivy/Snyk): no Critical CVEs

### 1.3 Consensus & Validators
- [ ] Minimum 4 independent validators confirmed for launch
- [ ] 3-of-5 multisig admin key ceremony completed and verified
- [ ] Each validator tested Cosmovisor upgrade workflow
- [ ] Sentry node architecture deployed for each validator
- [ ] Double-sign protection (tmkms) configured on all validators
- [ ] Genesis validator set reviewed: stake distribution, commission rates

### 1.4 Economics
- [ ] Token distribution reviewed by legal counsel
- [ ] Vesting schedules verified in genesis.json
- [ ] Initial inflation/staking APR within expected range
- [ ] Fee-burn rate (20%) validated under load
- [ ] CosmWasm rewards escrow contract: test claim + double-claim prevention

### 1.5 Infrastructure
- [ ] Monitoring: all 14 Prometheus alert rules firing correctly on testnet
- [ ] PagerDuty/Slack routing tested with real alert
- [ ] Grafana dashboard deployed and showing live data
- [ ] State sync: tested cold sync from snapshot < 30 minutes
- [ ] Block explorer live and indexed from genesis
- [ ] WS relay connected and streaming events to frontend

---

## TIER 2 — Should-Have (complete before or within 48h of launch)

### 2.1 Developer Experience
- [ ] gRPC reflection working (grpcurl list returns all services)
- [ ] OpenAPI spec matches implemented routes
- [ ] TypeScript SDK published to npm (`@tamizhi/chain-sdk`)
- [ ] CosmJS integration tests pass against testnet
- [ ] Testnet faucet operational

### 2.2 Frontend
- [ ] Wallet app: connect, send, view rewards — tested on mobile
- [ ] Literary browser: browse, search, submit — tested on 3 browsers
- [ ] Both apps load in < 3s on a standard connection
- [ ] Error states handled gracefully (chain down, wallet not connected)

### 2.3 Documentation
- [ ] Validator guide reviewed by an external validator
- [ ] Key ceremony guide tested by security officer
- [ ] Developer quickstart tested by a developer not on the team
- [ ] API docs (openapi.yaml) validated with swagger-validator

### 2.4 Content
- [ ] 53 seed literary works verified on testnet
- [ ] Cultural guide reviewed by Tamil literature scholar
- [ ] All work content hashes verified against source texts

---

## TIER 3 — Nice-to-Have (post-launch within 2 weeks)

- [ ] gRPC-Web proxy (Envoy) deployed for browser gRPC calls
- [ ] Discord bot for faucet and block notifications
- [ ] Mobile wallet (React Native)
- [ ] Governance proposal submitted for first parameter update
- [ ] Load test results published (TPS baseline)
- [ ] Second security audit by external firm

---

## Go/No-Go Decision

**Date**: ___________
**Decision**: [ ] GO | [ ] NO-GO | [ ] CONDITIONAL GO
**Conditions** (if conditional):

| Tier 1 Item | Status | Owner | Deadline |
|-------------|--------|-------|----------|
| ... | | | |

**Signatures required** (3 of 5 multisig keyholders):
1. Lead Developer: ___________
2. Security Officer: ___________
3. Community Representative: ___________

---

## Launch Day Runbook

### T-24h
- [ ] Final testnet smoke test (7 test cases from e2e-smoke-test.sh)
- [ ] Notify all validators of launch time
- [ ] Confirm all monitoring dashboards live
- [ ] Announce in Discord/Telegram

### T-4h
- [ ] All validators confirm Cosmovisor ready
- [ ] Genesis file SHA256 distributed and confirmed by all validators
- [ ] War room opened (Telegram/Discord thread)

### T-0 (Genesis Time: 2026-06-01T00:00:00Z)
- [ ] All validators start nodes simultaneously
- [ ] Monitor first block production
- [ ] Confirm block explorer shows block 1
- [ ] Confirm WS relay streaming

### T+1h
- [ ] Confirm all validators producing blocks
- [ ] Submit first governance proposal (parameter update test)
- [ ] Confirm faucet operational

### T+24h
- [ ] Confirm 24h uptime across all validators
- [ ] Check alert history (no false positives)
- [ ] Publish launch announcement

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Lead Developer | TBD | |
| Security Officer | TBD | |
| Validator Lead | TBD | |
| Legal/Compliance | TBD | |
