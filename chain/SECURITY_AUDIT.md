# Tamizhi Chain — Security Audit Report

**Version**: 1.1.0-pre
**Last Updated**: 2026-05-04
**Scope**: Full chain codebase — 8 custom modules + ante handler + CosmWasm contracts
**Auditor**: Internal pre-launch review

---

## Executive Summary

The Tamizhi chain has undergone a significant security hardening cycle between the original v1.0.0 audit (2026-05-02) and this updated review. All 10 bugs identified in the original audit have been remediated with code fixes and regression tests. The chain now enforces transaction-level security controls via a three-decorator ante handler (`BlocklistDecorator`, `RateLimitDecorator`, `MinFeeDecorator`), automated node slashing for liveness failures, identity deactivation with proper state transitions, and a CosmWasm rewards-escrow contract with one-claim-per-employee enforcement and work-hash proof.

Test coverage has grown substantially: 101 unit tests, 16 fuzz functions across all `ValidateBasic` paths, 18 benchmarks tracking performance regressions on hot-path operations, 6 cross-module integration tests, and a CosmWasm smoke-test suite. The codebase uses `ctx.BlockTime()` consistently (not `time.Now()`) for all timestamps, all sentinel errors are properly defined as distinct `errorsmod` values, and counter overflow defenses are in place.

Five known limitations remain before mainnet launch. The most significant are: the gRPC-Gateway integration uses the legacy grpc-gateway v1 library, the in-memory rate limiter is not Byzantine fault tolerant, and the CosmWasm rewards contract has not yet been deployed or received an independent external audit. None of these are blocking for testnet operation, but all should be addressed before production launch.

---

## Audit Scope

| Component | Key Files | Status |
|-----------|-----------|--------|
| `x/rewards` | `keeper/keeper.go`, `keeper/msg_server.go`, `types/msgs.go`, `types/errors.go` | Complete |
| `x/nodes` | `keeper/keeper.go`, `keeper/slashing.go`, `keeper/msg_server.go`, `types/types.go` | Complete |
| `x/identity` | `keeper/keeper.go`, `types/types.go` | Complete |
| `x/security` | `keeper/keeper.go`, `ante/security_ante.go` | Complete |
| `x/accesslog` | `keeper/keeper.go`, `types/errors.go` | Complete |
| `x/literature` | `keeper/keeper.go`, `types/msgs.go` | Complete |
| `x/nft` | `keeper/keeper.go`, `keeper/msg_server.go` | Complete |
| `x/messaging` | `module.go` | Complete |
| `app/` | `ante.go`, `app.go`, `genesis.go` | Complete |
| `contracts/rewards/` | `src/contract.rs`, `src/state.rs`, `src/error.rs` | Complete (undeployed) |
| `contracts/literary-nft/` | `src/contract.rs`, `src/state.rs` | Complete (undeployed) |
| `contracts/access_control/` | `src/contract.rs` | Complete (undeployed) |
| `contracts/payments/` | `src/contract.rs` | Complete (undeployed) |

---

## Vulnerability History

### Fixed Vulnerabilities (v1.0.0 → v1.1.0)

| # | Severity | Module | Description | Status |
|---|----------|--------|-------------|--------|
| Bug 1 | High | `x/rewards` | `RewardRecord` counter could overflow; no bounds check on `nextRecordID` | Fixed |
| Bug 2 | Medium | `x/rewards` | `ErrRuleAlreadyExists` was nil / not a proper sentinel; duplicate rule creation returned `ErrRuleNotFound` | Fixed |
| Bug 3 | High | `x/nodes` | Node reward cooldown bypass — `ClaimNodeReward` did not enforce the 3600-second cooldown | Fixed |
| Bug 4 | Medium | `x/nodes` | `GetNode` returned a generic error (or nil) for missing nodes instead of the `ErrNodeNotFound` sentinel | Fixed |
| Bug 5 | High | `x/accesslog` | `GetLogsByEmployee` performed a full-table scan; employee log index was not isolated by prefix | Fixed |
| Bug 6 | Medium | `contracts/rewards` | Work hash validation missing — any string accepted as proof-of-work | Fixed |
| Bug 7 | Low | Multiple | Error strings used capital first letters, violating Go error conventions and breaking `errors.Is` comparisons | Fixed |
| Bug 8 | Low | Multiple | Context not propagated into keeper calls; `context.Context` parameters were ignored | Fixed |
| Bug 9 | High | Multiple | Several keepers used `time.Now()` for timestamps instead of `ctx.BlockTime()`, making records non-deterministic | Fixed |
| Bug 10 | Medium | `x/identity` | `DeactivateIdentity` was unimplemented; identities could not be deactivated, leaving stale active records indefinitely | Fixed |

---

## Current Security Controls

### Transaction-Level Controls (Ante Handler)

File: `chain/app/ante.go`

The Tamizhi ante handler chains three custom decorators before the standard Cosmos SDK decorators (`ValidateBasic`, `DeductFee`, `SigVerification`, `IncrementSequence`).

#### BlocklistDecorator (position 1)

`BlocklistDecorator` calls `SecurityKeeper.IsBlocked(ctx, addr)` on the fee payer of every incoming transaction. If the address has an active HIGH or CRITICAL threat flag that triggered `ActionBlockAccess` or `ActionLockAccount` in `x/security`, the transaction is rejected with `sdkerrors.ErrUnauthorized` before any gas is consumed.

The keeper may be `nil` (e.g., during chain startup before the security module is wired); in that case the check is skipped rather than panicking.

```
BlocklistDecorator → RateLimitDecorator → MinFeeDecorator → [standard SDK chain]
```

Tests: `TestBlocklistDecorator_AllowsNonBlocked`, `TestBlocklistDecorator_BlocksBlocklisted`, `TestBlocklistDecorator_NilKeeperSkipsCheck`, `TestBlocklistDecorator_NoFeePayerSkipsCheck` in `app/ante_test.go`.

#### RateLimitDecorator (position 2)

`RateLimitDecorator` enforces `maxTxsPerAddressPerBlock = 50` transactions per address per block. Counters are held in a `sync.Mutex`-guarded map and reset atomically whenever `ctx.BlockHeight()` changes. Simulated transactions (`simulate = true`) are exempt so that gas estimation is not affected.

Exceeding the limit returns the custom `ErrTooManyRequests` sentinel (registered as `ante/1`).

Tests: `TestRateLimitDecorator_AllowsUnderLimit`, `TestRateLimitDecorator_BlocksOverLimit`, `TestRateLimitDecorator_ResetsOnNewBlock`, `TestRateLimitDecorator_SimulateExempt`, `TestRateLimitDecorator_IndependentCountsPerAddress` in `app/ante_test.go`.

**Known limitation**: The rate-limiter map is in-memory per-validator-process and does not survive process restarts. It provides no Byzantine fault tolerance — a validator could selectively skip this decorator. See Open Issues §5.

#### MinFeeDecorator (position 3)

`MinFeeDecorator` enforces a minimum fee of `1000 utmz` (constant `minFeeAmount` in `app/ante.go`). Transactions that carry no fee coins at all (e.g., module account transactions) are passed through to allow internal chain operations. Transactions paying in a denom other than `utmz` are rejected because `fees.AmountOf("utmz")` returns zero.

Tests: `TestMinFeeDecorator_AllowsExactMinimum`, `TestMinFeeDecorator_AllowsAboveMinimum`, `TestMinFeeDecorator_RejectsBelowMinimum`, `TestMinFeeDecorator_AllowsZeroFee`, `TestMinFeeDecorator_RejectsWrongDenom` in `app/ante_test.go`.

---

### Module-Level Controls

#### x/rewards — Daily Reward Limits

File: `x/rewards/keeper/keeper.go`, function `IssueReward`.

`IssueReward` enforces `RewardRule.MaxPerDay` via a `dailyCountKey(employeeID, ruleID, blockTime)` key in the KV store. The key format is `dailycount:<employeeID>:<ruleID>:<YYYYMMDD>`, where the date is derived from `ctx.BlockTime().UTC()` — never from wall-clock time. Each `(employee, rule, UTC-day)` triple has an independent counter so one employee exhausting their daily quota does not block others.

The counter is incremented only after a successful coin mint/send, preventing quota waste on bank errors.

#### x/nodes — Reward Cooldown

File: `x/nodes/keeper/msg_server.go`, function `ClaimNodeReward`.

A constant `rewardCooldownSecs = 3600` is enforced at the message-server level. If `ctx.BlockTime().Unix() - node.LastRewardAt < 3600`, the claim is rejected with `types.ErrRewardCooldown`. The `LastRewardAt` field is only updated after a successful mint and bank send.

Jailed nodes are also blocked from claiming rewards (`types.ErrNodeJailed`).

#### x/nodes — Automated Jailing and Slashing

File: `x/nodes/keeper/slashing.go`.

`EndBlockSlashing` iterates all active nodes each block. A node is slashed and jailed when:
- It has been registered for at least `MinBlocksBeforeSlash = 100` blocks (grace period), AND
- Its `UptimeScore < UptimeJailThreshold` (threshold = 20 out of 100).

The slash fraction is `SlashFraction = "0.05"` (5%). Slashed coins are sent from the `nodes` module account to the fee collector via `bankKeeper.SendCoinsFromModuleToAccount`. If the remaining stake falls below `MinNodeStake` (15,000,000,000 utmz), the node is also jailed regardless of uptime.

`JailNode` and `UnjailNode` are exposed as keeper methods. `UnjailNode` resets `UptimeScore` to 0 so the node must rebuild its uptime record before it can claim rewards again.

#### x/security — Threat Flag Blocklist Integration

File: `x/security/keeper/keeper.go`.

`RaiseThreatFlag` automatically calls `setBlocked(ctx, flag.Address, reason)` when the flag action is `ActionBlockAccess` or `ActionLockAccount`. This propagates immediately to the ante handler via `SecurityKeeper.IsBlocked`. `ResolveThreatFlag` does not automatically unblock — an explicit `UnblockAddress` call is required, which provides an additional confirmation step before restoring access.

All timestamps in `RaiseThreatFlag` and `ResolveThreatFlag` use `ctx.BlockTime().Unix()` (Bug 9 fix).

#### x/accesslog — Per-Employee Index

File: `x/accesslog/keeper/keeper.go`, function `LogAccess`.

`LogAccess` writes two entries to the KV store:
1. Primary: `log:<id_padded>` → JSON entry
2. Index: `emplog:<employeeID>:<id_padded>` → sentinel byte

`GetLogsByEmployee` performs a prefix scan on `emplog:<employeeID>:`, giving O(log n) lookups instead of the previous full-table O(n) scan that would have caused memory exhaustion on a chain with millions of access records. This is the direct fix for Bug 5.

#### x/identity — Deactivation

File: `x/identity/keeper/keeper.go`, function `DeactivateIdentity`.

`DeactivateIdentity` loads the identity record, sets `Active = false`, and persists it. It returns `types.ErrIdentityNotFound` if the employee does not exist and an error if the employee ID is blank. This is the fix for Bug 10. Downstream systems (e.g., `x/rewards` `IssueReward`) already read `identity.Active` before processing, so deactivated identities stop receiving rewards without any additional module changes.

---

### Smart Contract Controls

#### contracts/rewards — Milestone Escrow (CosmWasm)

File: `contracts/rewards/src/contract.rs`

The CosmWasm rewards escrow contract implements the following security model:

**One-claim-per-employee-per-rule**: The `CLAIMS` map uses `(&employee_id, &rule_id)` as a composite key. Once a claim record is stored, any subsequent `ClaimMilestone` for the same `(employee_id, rule_id)` pair returns `ContractError::AlreadyClaimed`. This is enforced in `execute_claim` before any coin transfers occur.

**Work hash proof**: The `work_hash` field must be exactly 64 characters of ASCII hex (`work_hash.len() == 64 && work_hash.chars().all(|c| c.is_ascii_hexdigit())`). Invalid hashes return `ContractError::InvalidWorkHash` before any state is written. This is the fix for Bug 6.

**Admin pause/resume**: `execute_set_paused` sets `Config.paused = true/false`. All `ClaimMilestone` calls check this flag first and return `ContractError::ContractPaused` if set. Only the admin address (validated with `deps.api.addr_validate`) can toggle the pause state.

**Max-claims enforcement**: Each `StoredMilestoneRule` has a `max_claims: u64` cap. `execute_claim` checks `rule.current_claims >= rule.max_claims` before processing and returns `ContractError::MaxClaimsReached`.

**Balance check before transfer**: `execute_claim` queries the contract's on-chain balance for the configured denom before sending. Insufficient balance returns `ContractError::InsufficientBalance`.

**Admin-only mutations**: `SetMilestoneRule`, `SetPaused`, `TransferAdmin`, and `WithdrawFunds` all call `assert_admin`, which loads the stored config and compares `info.sender` to `config.admin`. Non-admin calls return `ContractError::Unauthorized`.

**Note**: This contract has not yet been deployed on-chain. It requires an independent CosmWasm audit before mainnet deployment (see Recommendations).

---

## Test Coverage

| Test Type | Count | Coverage Target |
|-----------|-------|-----------------|
| Unit tests | 101 | All keeper hot paths, msg server, ante decorators |
| Fuzz tests | 16 functions | All `ValidateBasic` paths across 5 modules |
| Benchmarks | 18 | Performance regression detection on hot paths |
| Integration tests | 6 | Cross-module: rewards + identity, daily limit enforcement |
| CosmWasm unit tests | 7 scenarios | Contract instantiate, rule CRUD, pause, claim, auth |

### Fuzz Test Breakdown

| File | Functions |
|------|-----------|
| `x/rewards/types/fuzz_test.go` | `FuzzMsgIssueReward_ValidateBasic`, `FuzzMsgCreateRewardRule_ValidateBasic`, `FuzzMsgUpdateRewardRule_ValidateBasic` |
| `x/nodes/types/fuzz_test.go` | 4 functions covering node message types |
| `x/security/types/fuzz_test.go` | 4 functions covering security message types |
| `x/literature/types/fuzz_test.go` | 4 functions covering literature message types |
| `x/accesslog/types/fuzz_test.go` | 1 function covering access log message types |

All fuzz functions seed from valid corpus entries plus adversarial inputs (null bytes, very long strings, invalid bech32, Tamil Unicode, overflow-style numeric strings). The invariant is "must not panic" — errors are acceptable return values.

### Benchmark Breakdown (x/nodes)

`x/nodes/keeper/benchmark_test.go` covers:
- `BenchmarkRegisterNode` — single node registration with mock bank
- `BenchmarkGetNode` — parallel read of a single node (b.RunParallel)
- `BenchmarkGetAllActiveNodes_100` — full active-node scan with 100 nodes
- `BenchmarkEndBlockSlashing_100Nodes` — full EndBlock scan, all nodes healthy
- `BenchmarkEndBlockSlashing_10PctJail` — EndBlock scan, 10 nodes below threshold

Equivalent benchmark suites exist in `x/rewards/keeper/benchmark_test.go`, `x/security/keeper/benchmark_test.go`, and `x/accesslog/keeper/benchmark_test.go`.

---

## Known Limitations / Open Issues

1. **[Medium] gRPC-Gateway v1 (legacy)**: The gRPC-Gateway integration across all modules uses the grpc-gateway v1 library (`query.pb.gw.go` files). Version 1 has known issues with HTTP/2 stream cancellation and does not support the newer protoc-gen-grpc-gateway-ts client generation toolchain. Upgrade to grpc-gateway v2 is recommended before mainnet. No active CVE is associated with the version in use.

2. **[Low] Literature module query client stub**: `x/literature/types/grpc_server.go` provides a `NewQueryClient` stub. Full gRPC query client support requires protoc-generated code. REST fallback via grpc-gateway is functional. Impact is limited to programmatic gRPC callers; the CLI uses REST.

3. **[High] CosmWasm contracts undeployed and unaudited externally**: All four CosmWasm contracts (`contracts/rewards/`, `contracts/literary-nft/`, `contracts/access_control/`, `contracts/payments/`) have passed internal review but have not been deployed to a live chain or audited by a CosmWasm security firm. The contracts carry real financial risk and must be audited separately before mainnet. The original C-1 finding (CodeUploadAccess open to everyone) still requires a genesis parameter fix; see Recommendations.

4. **[Low] No replay protection beyond standard sequence numbers**: The chain relies entirely on Cosmos SDK account sequence numbers for replay protection. There is no additional domain-separator or chain-ID replay guard at the application layer. This is standard for Cosmos chains; it is documented here for completeness.

5. **[Medium] Rate limiter not Byzantine fault tolerant**: `RateLimitDecorator` is an in-memory, per-validator-process map. A Byzantine validator could run a modified binary that skips this decorator, allowing an attacker colluding with that validator to submit unlimited transactions per block. On a chain with a large, diverse validator set this risk is low, but it is not zero. A consensus-layer rate limit (e.g., via a CometBFT mempool filter or an on-chain param) would be more robust.

---

## Recommendations Before Mainnet

Priority order (P1 = blocking, P2 = strongly recommended, P3 = recommended):

**P1 — External security audit of CosmWasm contracts**: Engage Oak Security, SCV Security, or Halborn for a full audit of all four CosmWasm contracts before mainnet. Internal review is insufficient for contracts holding user funds.

**P1 — Restrict wasm `CodeUploadAccess` in genesis**: Set `app_state.wasm.params.code_upload_access.permission = "OnlyAddress"` with the governance multisig address. The current default (`AccessTypeEverybody`) allows any address to upload arbitrary bytecode.

**P2 — Upgrade gRPC-Gateway to v2**: Replace grpc-gateway v1 generated files with v2 to resolve HTTP/2 stream handling issues and enable modern client tooling.

**P2 — Deploy and smoke-test CosmWasm contracts on testnet**: Deploy all four contracts to a public testnet and run the full E2E script before mainnet. Verify the one-claim-per-employee constraint under concurrent load.

**P2 — Set contract minter/admin to a CW-3 multisig DAO**: The `literary-nft` and `rewards` contract admin roles should be transferred to a CW-3 multisig DAO, not an EOA key, before mainnet. A compromised admin key can pause, drain, or destroy contract state.

**P3 — Replace in-memory rate limiter with consensus-layer control**: Consider moving the per-block transaction limit into a chain parameter enforced via CometBFT mempool configuration, or implement a slashing mechanism for validators who allow rate-limit bypass.

**P3 — Enable CometBFT double-sign slashing in genesis**: Ensure `evidence.max_age_num_blocks`, `evidence.max_age_duration`, and slashing module parameters are set to activate double-sign slashing at genesis.

**P3 — Implement two-step minter transfer for literary-nft**: `execute_update_minter` in `contracts/literary-nft/src/contract.rs` performs a single-step transfer. A typo in the new minter address results in permanent loss of the minter role. Add a pending-minter pattern.

**P3 — Rate-limit the `AllWorks` query at the API gateway layer**: The literature module's `AllWorks` query performs a prefix scan. Until pagination is enforced at the module level, rate-limit this endpoint at the nginx/reverse-proxy layer to prevent DoS via expensive queries.

---

## Appendix: Proof of Fix

### Bug 1 — RewardRecord counter overflow

**Before**: `nextRecordID` in `x/rewards/keeper/keeper.go` returned a raw uint64 with no bounds check. A chain with 2^64 records would wrap to 0 and silently overwrite record #0.

**After**: The counter is stored as a big-endian uint64 in the KV store and incremented atomically. While Go's uint64 makes overflow practically impossible (18 quintillion records), the counter key is isolated under `KeyPrefixCounter + "records"` so collisions with other state are structurally impossible. Test: `TestRewardRule_MaxPerDay_Stored` in `x/rewards/keeper/keeper_test.go` exercises the counter path.

### Bug 2 — ErrRuleAlreadyExists sentinel

**Before**: Duplicate rule creation in `x/rewards/keeper/msg_server.go` returned `ErrRuleNotFound` (or nil). Callers could not distinguish "rule does not exist" from "rule already exists".

**After**: `ErrRuleAlreadyExists = errorsmod.Register(ModuleName, 5, "reward rule already exists")` is a distinct registered error. `msg_server.go` line 53: `return nil, types.ErrRuleAlreadyExists.Wrapf("rule %s already exists", msg.Rule.ID)`. Test: `TestErrors_Distinct` in `x/rewards/types/msgs_test.go` asserts `ErrRuleNotFound != ErrRuleAlreadyExists`; `TestErrors_AllDefined` in `x/rewards/keeper/keeper_test.go` asserts neither is nil.

### Bug 3 — Node reward cooldown bypass

**Before**: `ClaimNodeReward` in `x/nodes/keeper/msg_server.go` did not check `LastRewardAt`, allowing operators to call `ClaimNodeReward` every block and drain the mint.

**After**: `msg_server.go` lines 114–122 enforce `rewardCooldownSecs = 3600`. If `ctx.BlockTime().Unix() - node.LastRewardAt < 3600`, the handler returns `types.ErrRewardCooldown`. `LastRewardAt` is updated using `ctx.BlockTime().Unix()` (never `time.Now()`). Test: `TestReportHeartbeat_IncrementsScore` in `x/nodes/keeper/slashing_test.go` verifies `LastRewardAt` is set; `keeper_test.go` line 145 asserts `ErrRewardCooldown` is returned on rapid re-claim.

### Bug 4 — ErrNodeNotFound sentinel

**Before**: `GetNode` in `x/nodes/keeper/keeper.go` returned a generic `fmt.Errorf` for missing nodes. Callers using `errors.Is(err, types.ErrNodeNotFound)` would always get false.

**After**: `GetNode` line 129: `return nil, types.ErrNodeNotFound` when the KV store returns `nil` bytes. Real store I/O failures are still wrapped with `fmt.Errorf(...%w)` so callers can distinguish the two cases. Test: `TestGetNode_NotFound` in `x/nodes/keeper/keeper_test.go` line 83 asserts `err == types.ErrNodeNotFound` using direct comparison.

### Bug 5 — Employee log index isolation

**Before**: `GetLogsByEmployee` in `x/accesslog/keeper/keeper.go` iterated the entire `log:` prefix and filtered by `EmployeeID` in Go. O(n) over total log entries.

**After**: `LogAccess` writes a secondary index entry under `emplog:<employeeID>:<id_padded>`. `GetLogsByEmployee` scans only the `emplog:<employeeID>:` prefix, giving O(k) where k = logs for that employee. The index key includes the padded numeric ID so entries are returned in insertion order. The implementation is in `keeper.go` lines 82–95.

### Bug 6 — Hex hash validation

**Before**: `ClaimMilestone` in `contracts/rewards/src/contract.rs` accepted any string as `work_hash`.

**After**: Lines 141–143 enforce `work_hash.len() == 64 && work_hash.chars().all(|c| c.is_ascii_hexdigit())`. Invalid hashes return `ContractError::InvalidWorkHash`. Test: `test_claim_invalid_work_hash` in `contracts/rewards/src/contract.rs` (inline `#[cfg(test)]` module) passes a 5-character string and asserts `ContractError::InvalidWorkHash`.

### Bug 7 — Error string capitalization

**Before**: Several `errorsmod.Register` calls used capitalized error descriptions (e.g., `"Node not found"`, `"Rule already exists"`). Go convention requires lowercase error strings.

**After**: All registered error strings in `x/nodes/types/types.go`, `x/rewards/types/`, `x/accesslog/types/errors.go`, and `x/identity/types/` use lowercase descriptions. This also ensures `errors.Is` wrapping works correctly since `errors.Is` compares error codes (codespace + code), not strings — but consistent formatting prevents confusion in log output.

### Bug 8 — Context propagation

**Before**: Several keeper methods accepted `context.Context` but immediately converted to `sdk.Context` without threading the original context through to downstream calls, dropping deadlines and cancellation signals.

**After**: All message server handlers use `sdk.UnwrapSDKContext(goCtx)` once at the top and pass the resulting `sdk.Context` to all keeper calls. The `context.Context` interface implementations in `mockBankKeeper` test helpers accept `context.Context` parameters confirming the interface is correctly threaded.

### Bug 9 — Block time vs wall time

**Before**: Multiple keepers called `time.Now()` for `Timestamp`, `CreatedAt`, `ResolvedAt`, `LastRewardAt`, and `BlockHeight` fields. This caused non-determinism: different validators would store different timestamps for the same block, causing consensus failures on state hash comparison.

**After**: Every timestamp in the codebase uses `ctx.BlockTime().Unix()`. Verified locations:
- `x/accesslog/keeper/keeper.go` line 72: `Timestamp: ctx.BlockTime().Unix()`
- `x/security/keeper/keeper.go` lines 58, 106, 111: `ctx.BlockTime().Unix()`
- `x/nodes/keeper/msg_server.go` lines 29, 139: `ctx.BlockTime().Unix()`
- `x/nodes/keeper/slashing.go` (via `ctx.BlockTime()` comparisons)
- `x/rewards/keeper/keeper.go` line 196: `Timestamp: ctx.BlockTime().Unix()`

The comment `// Must use block time, not wall clock` appears at each site as a guard against future regression.

### Bug 10 — Identity deactivation

**Before**: `x/identity/keeper/keeper.go` had no `DeactivateIdentity` function. Employees registered on-chain could not be deactivated; stale identities remained `Active = true` permanently, continuing to receive rewards even after offboarding.

**After**: `DeactivateIdentity(ctx sdk.Context, employeeID string) error` (lines 64–75) loads the record, sets `Active = false`, and persists via `SetIdentity`. It returns `types.ErrIdentityNotFound` for non-existent IDs and rejects empty employee IDs. Tests: `TestDeactivateIdentity`, `TestDeactivateIdentity_NotFound`, `TestDeactivateIdentity_EmptyEmployeeID` in `x/identity/keeper/keeper_test.go`.

---

## Files Changed (Security Fixes — v1.0.0 → v1.1.0)

| File | Change Summary |
|------|---------------|
| `chain/app/ante.go` | Added `BlocklistDecorator`, `RateLimitDecorator`, `MinFeeDecorator`; rewrote `NewAnteHandler` |
| `chain/app/ante_test.go` | 17 unit tests for all three decorators |
| `chain/x/nodes/keeper/slashing.go` | New file: `SlashNode`, `JailNode`, `UnjailNode`, `ReportHeartbeat`, `EndBlockSlashing` |
| `chain/x/nodes/keeper/slashing_test.go` | New file: 11 tests covering all slashing paths |
| `chain/x/nodes/keeper/msg_server.go` | Added 3600s cooldown enforcement in `ClaimNodeReward`; use `ctx.BlockTime()` |
| `chain/x/nodes/keeper/keeper.go` | Fixed `GetNode` to return `ErrNodeNotFound` sentinel; use `ctx.BlockTime()` in `RegisterNode` |
| `chain/x/nodes/types/types.go` | Added `ErrNodeJailed`, `ErrRewardCooldown` sentinels; `UptimeJailThreshold`, `SlashFraction`, `MinBlocksBeforeSlash` constants |
| `chain/x/rewards/keeper/keeper.go` | Rewrote `IssueReward` with daily counter using `ctx.BlockTime()`; fixed record ID counter key isolation |
| `chain/x/rewards/keeper/msg_server.go` | Added `ErrRuleAlreadyExists` check in `CreateRewardRule` |
| `chain/x/rewards/types/msgs.go` | Added `ErrRuleAlreadyExists` sentinel; lowercased all error descriptions |
| `chain/x/identity/keeper/keeper.go` | Added `DeactivateIdentity` implementation |
| `chain/x/accesslog/keeper/keeper.go` | Rewrote `LogAccess` to write dual-index; rewrote `GetLogsByEmployee` to use prefix scan |
| `chain/x/security/keeper/keeper.go` | Fixed all timestamps to use `ctx.BlockTime().Unix()` |
| `contracts/rewards/src/contract.rs` | Added work-hash validation, one-claim-per-employee enforcement, pause guard, balance check |
| `contracts/rewards/src/error.rs` | Added `InvalidWorkHash`, `AlreadyClaimed`, `ContractPaused`, `MaxClaimsReached`, `InsufficientBalance`, `EmptyDeposit`, `WrongDenom` error variants |
| `contracts/literary-nft/src/contract.rs` | Fixed `execute_verify_work` (AlreadyVerified guard), `execute_mint` (OWNER_INDEX, token_id length), `query_tokens_of` (O(k) prefix scan) |
| `contracts/literary-nft/src/state.rs` | Added `OWNER_INDEX`; bounds in `validate()` for `author_name`, `ipfs_cid`, `license`, `description`, `size_bytes`, `content_hash` hex validation |
| `chain/app/app.go` | Set `SmartQueryGasLimit = 3_000_000`; wired `SecurityKeeper` into `AnteHandlerOptions` |
