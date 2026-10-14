# Contributing to Tamizhi Chain

## Development Setup

### Prerequisites
- Go 1.22+
- Rust 1.74+ (for CosmWasm contracts)
- Node.js 20+ (for TypeScript SDK and apps)
- Docker + Docker Compose (for localnet)

### Quick Start
```bash
git clone https://github.com/tamizhi/chain
cd chain

# Build the chain binary
make build

# Run tests
make test

# Start a local testnet
make localnet-start
```

## Repository Layout

```
chain/
├── app/                    # App wiring (module manager, ante handler)
├── cmd/tamizhi/            # Main binary entrypoint
├── contracts/              # CosmWasm contracts (literary-nft, rewards, payments, access_control)
├── docs/                   # Architecture, tokenomics, runbooks, API spec
├── genesis/                # Testnet genesis files
├── monitoring/             # Prometheus rules, Alertmanager config, Grafana dashboards
├── proto/                  # Protobuf definitions
├── scripts/                # Localnet setup, e2e smoke tests, deploy helpers
├── sdk/                    # TypeScript SDK (@tamizhi/chain-sdk)
├── tests/                  # Integration and e2e tests
└── x/                      # Cosmos SDK modules
    ├── accesslog/
    ├── feeburn/
    ├── identity/
    ├── literature/
    ├── messaging/
    ├── nft/
    ├── nodes/
    ├── rewards/
    └── security/
```

## Module Development Guide

### Adding a New Module

1. Create the module scaffold under `x/<module>/`:
   ```
   x/<module>/
   ├── keeper/         # State read/write logic
   ├── types/          # Msgs, params, events, codec registration
   ├── module.go       # AppModule implementation
   └── genesis.go      # InitGenesis / ExportGenesis
   ```

2. Define your protobuf messages in `proto/tamizhi/<module>/v1/`.

3. Run `make proto-gen` to regenerate Go bindings.

4. Register the module in `app/app.go`:
   - Add keeper to `App` struct.
   - Add to `ModuleBasics`.
   - Wire into `ModuleManager` and `BeginBlockers`/`EndBlockers` order.

5. Write unit tests (keeper + msg server) in `x/<module>/keeper/` and `x/<module>/types/`.
   - Minimum coverage expectation: 80% on keeper logic.
   - Add at least one fuzz test in `x/<module>/types/` for `ValidateBasic`.

6. Emit events for every state transition — follow existing module conventions.

### Ante Handler

The custom ante handler chain lives in `app/ante/`. Order matters:

```
SetUpContextDecorator
→ BlocklistDecorator        (security module)
→ RateLimitDecorator        (security module)
→ ValidateBasicDecorator
→ TxTimeoutHeightDecorator
→ ValidateMemoDecorator
→ ConsumeGasForTxSizeDecorator
→ DeductFeeDecorator
→ FeeBurnDecorator          (feeburn module — burns 20% of fees)
→ SetPubKeyDecorator
→ SigVerificationDecorator
```

Do not add blocking network calls or unbounded iteration in ante decorators.

### CosmWasm Contracts

Contracts live under `contracts/`. Each contract is a Rust crate targeting `wasm32-unknown-unknown`.

```bash
# Build a specific contract
make contract-build          # literary-nft
make rewards-build           # rewards escrow
make payments-build          # payments
make access-build            # access_control

# Build all
make all-contracts

# Validate a compiled wasm
make contract-check
```

All contracts must pass `cosmwasm-check` before deployment. Checksums of deployed binaries are recorded in `contracts/checksums.txt`.

## Pull Request Process

1. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Write tests for all new functionality. PRs without tests will not be merged.

3. Run the full check suite locally before pushing:
   ```bash
   make test lint
   ```

4. Submit the PR with:
   - A clear description of what changed and why.
   - Reference to any related issues.
   - Notes on any migration or breaking changes.

5. A PR requires **2 approvals** from `CODEOWNERS` before merging.

6. Squash-merge is preferred for feature branches. Merge commits are used for release branches.

### Commit Message Convention

```
<type>(<scope>): <short summary>

<body — optional>

<footer — optional, e.g. Closes #123>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`

Examples:
```
feat(literature): add pagination to QueryAllWorks
fix(feeburn): correct burn amount rounding for odd fee values
test(rewards): fuzz ValidateBasic for MsgIssueReward
```

## Testing Standards

| Type | Command | Minimum bar |
|------|---------|-------------|
| Unit | `make test-unit` | All pass, no flakes |
| Coverage | `make test-cover` | > 70% on keeper logic |
| Fuzz (CI) | `make fuzz` | 30s per function, 0 findings |
| Fuzz (pre-launch) | manual | 24h continuous, 0 findings |
| Benchmarks | `go test -bench=. ./x/...` | No p95 regression vs baseline |
| E2E smoke | `make e2e-smoke` | All 7 cases pass |
| Load | `make localnet-start && k6 run load-tests/basic.js` | Pass at target TPS |

## Security Vulnerabilities

**Do NOT open a public GitHub issue for security vulnerabilities.**

Report privately to **security@tamizhi.ai** with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

You will receive an acknowledgement within 48 hours. Critical findings are eligible for a bug bounty reward (details on the website).

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) Code of Conduct. The Tamil literary tradition this chain preserves deserves a welcoming, respectful community. Harassment of any kind will not be tolerated.
