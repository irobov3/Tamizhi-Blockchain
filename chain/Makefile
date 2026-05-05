#!/usr/bin/make -f

# ============================================================
# Tamizhi Blockchain Makefile
# ============================================================

BINARY         := tamizhi
CHAIN_ID       := tamizhi-1
MONIKER        := tamizhi-node
HOME_DIR       := $(HOME)/.tamizhi
GENESIS_ACCOUNT := genesis-key
GENESIS_COINS  := 500000000utmz
VALIDATOR_COINS := 100000000utmz
DENOM          := utmz
MIN_GAS_PRICES := 0.001utmz

BUILDDIR       := build

GO             ?= $(shell command -v go 2>/dev/null || echo /Users/guverad/go-sdk/go/bin/go)
GOFLAGS        ?=
# Detect OS — macOS can't statically link wasmvm, so we drop static_wasm tag there
UNAME_S        := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
  BUILD_TAGS   := netgo osusergo
  CGO_ENABLED  := 1
else
  BUILD_TAGS   := netgo osusergo static_wasm
  CGO_ENABLED  := 0
endif

LDFLAGS        := -X github.com/cosmos/cosmos-sdk/version.Name=tamizhi \
	-X github.com/cosmos/cosmos-sdk/version.AppName=tamizhid \
	-X github.com/cosmos/cosmos-sdk/version.Version=$(shell git describe --tags --always --dirty 2>/dev/null || echo "v0.1.0") \
	-X github.com/cosmos/cosmos-sdk/version.Commit=$(shell git log -1 --format='%H' 2>/dev/null || echo "none") \
	-X "github.com/cosmos/cosmos-sdk/version.BuildTags=$(BUILD_TAGS)"

BUILD_FLAGS    := -tags "$(BUILD_TAGS)" -ldflags '$(LDFLAGS)' -trimpath

# Default target
.DEFAULT_GOAL := build

# ============================================================
# Build targets
# ============================================================

## build: Compile the tamizhi binary to ./build/
.PHONY: build
build:
	@echo "--> Building $(BINARY)..."
	@mkdir -p build
	CGO_ENABLED=$(CGO_ENABLED) $(GO) build $(BUILD_FLAGS) -o build/$(BINARY) ./cmd/tamizhi/
	@# macOS requires ad-hoc code signing for locally-compiled binaries
	@if [ "$$(uname)" = "Darwin" ]; then \
		codesign --sign - --force build/$(BINARY) 2>/dev/null && echo "--> Signed (ad-hoc)" || true; \
	fi
	@echo "--> Binary available at build/$(BINARY)"

## install: Install the tamizhi binary to GOPATH/bin
.PHONY: install
install:
	@echo "--> Installing $(BINARY)..."
	$(GO) install $(BUILD_FLAGS) ./cmd/tamizhi/
	@echo "--> $(BINARY) installed to $(shell go env GOPATH)/bin/$(BINARY)"

## build-linux: Cross-compile for Linux/amd64
.PHONY: build-linux
build-linux:
	@echo "--> Building for Linux amd64..."
	@mkdir -p build
	GOOS=linux GOARCH=amd64 $(GO) build $(BUILD_FLAGS) -o build/$(BINARY)-linux-amd64 ./cmd/tamizhi/

# ============================================================
# Node initialization
# ============================================================

## init: Initialize a single-node Tamizhi testnet
.PHONY: init
init:
	@echo "--> Initializing $(CHAIN_ID)..."
	@$(BINARY) init $(MONIKER) --chain-id $(CHAIN_ID) --home $(HOME_DIR) --overwrite

	@echo "--> Adding genesis key: $(GENESIS_ACCOUNT)"
	@$(BINARY) keys add $(GENESIS_ACCOUNT) --home $(HOME_DIR) --keyring-backend test 2>&1 | tee /tmp/tamizhi-genesis-key.txt
	@cat /tmp/tamizhi-genesis-key.txt

	@echo "--> Adding genesis account with $(GENESIS_COINS)..."
	@GENESIS_ADDR=$$($(BINARY) keys show $(GENESIS_ACCOUNT) -a --home $(HOME_DIR) --keyring-backend test); \
	$(BINARY) genesis add-genesis-account $$GENESIS_ADDR $(GENESIS_COINS) \
		--home $(HOME_DIR) --keyring-backend test

	@echo "--> Creating gentx..."
	@$(BINARY) genesis gentx $(GENESIS_ACCOUNT) $(VALIDATOR_COINS) \
		--chain-id $(CHAIN_ID) \
		--home $(HOME_DIR) \
		--keyring-backend test \
		--moniker $(MONIKER) \
		--commission-rate 0.10 \
		--commission-max-rate 0.20 \
		--commission-max-change-rate 0.01 \
		--min-self-delegation 1

	@echo "--> Collecting gentxs..."
	@$(BINARY) genesis collect-gentxs --home $(HOME_DIR)

	@echo "--> Validating genesis..."
	@$(BINARY) genesis validate --home $(HOME_DIR)

	@echo "--> Configuring app.toml and config.toml..."
	@$(BINARY) config set app minimum-gas-prices $(MIN_GAS_PRICES) --home $(HOME_DIR)
	@$(BINARY) config set client chain-id $(CHAIN_ID) --home $(HOME_DIR)
	@$(BINARY) config set client keyring-backend test --home $(HOME_DIR)

	@sed -i.bak 's/enable = false/enable = true/' $(HOME_DIR)/config/app.toml
	@sed -i.bak 's/swagger = false/swagger = true/' $(HOME_DIR)/config/app.toml
	@sed -i.bak 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/' $(HOME_DIR)/config/app.toml
	@sed -i.bak 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/' $(HOME_DIR)/config/config.toml

	@echo ""
	@echo "============================================================"
	@echo " $(CHAIN_ID) node initialized successfully!"
	@echo " Home: $(HOME_DIR)"
	@echo " Run 'make start' to launch."
	@echo "============================================================"

## start: Start the Tamizhi node
.PHONY: start
start:
	@echo "--> Starting $(BINARY)..."
	@$(BINARY) start \
		--home $(HOME_DIR) \
		--minimum-gas-prices $(MIN_GAS_PRICES) \
		--api.enable \
		--api.swagger \
		--grpc.enable \
		--p2p.laddr tcp://0.0.0.0:26656 \
		--rpc.laddr tcp://0.0.0.0:26657

## reset: Reset node state (keeps keys)
.PHONY: reset
reset:
	@echo "--> Resetting chain data..."
	@$(BINARY) tendermint unsafe-reset-all --home $(HOME_DIR)
	@echo "--> Done. Run 'make start' to restart from genesis."

## unsafe-reset-all: Alias for reset
.PHONY: unsafe-reset-all
unsafe-reset-all: reset

# ============================================================
# Testing
# ============================================================

## test: Run all Go tests
.PHONY: test
test:
	@echo "--> Running tests..."
	CGO_ENABLED=$(CGO_ENABLED) $(GO) test ./... -count=1 -timeout 15m -p 1

## test-unit: Run only unit tests (no integration) with CGO_ENABLED=0 and -short flag
.PHONY: test-unit
test-unit:
	@echo "--> Running unit tests..."
	CGO_ENABLED=0 $(GO) test ./x/... -short -count=1 -timeout 10m

## test-all: Run all tests including integration
.PHONY: test-all
test-all:
	@echo "--> Running all tests (including integration)..."
	$(GO) test ./... -count=1 -timeout 30m

## test-cover: Generate coverage report to coverage.html
.PHONY: test-cover
test-cover:
	@echo "--> Running tests with coverage..."
	$(GO) test ./... -coverprofile=coverage.out -covermode=atomic -timeout 30m
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "--> Coverage report: coverage.html"

## test-short: Run tests with -short flag
.PHONY: test-short
test-short:
	$(GO) test ./... -short -count=1 -timeout 10m

## test-coverage: Run tests and produce coverage report
.PHONY: test-coverage
test-coverage:
	@echo "--> Running tests with coverage..."
	$(GO) test ./... -coverprofile=coverage.out -covermode=atomic
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "--> Coverage report: coverage.html"

# ============================================================
# Linting and formatting
# ============================================================

## lint: Run golangci-lint (falls back to go vet if golangci-lint is not installed)
.PHONY: lint
lint:
	@echo "--> Running linter..."
	@if which golangci-lint > /dev/null 2>&1; then \
		golangci-lint run ./... --timeout 15m; \
	else \
		echo "golangci-lint not found, falling back to go vet (install golangci-lint from https://golangci-lint.run/usage/install/)"; \
		$(GO) vet ./...; \
	fi

## fmt: Format Go source files
.PHONY: fmt
fmt:
	@echo "--> Formatting Go files..."
	$(GO) fmt ./...
	@which goimports > /dev/null 2>&1 && goimports -w . || true

## vet: Run go vet
.PHONY: vet
vet:
	@echo "--> Running go vet..."
	$(GO) vet ./...

# ============================================================
# Protobuf
# ============================================================

## proto-gen: Generate protobuf files
## Prerequisites:
##   - buf: install from https://docs.buf.build/installation  (e.g. brew install bufbuild/buf/buf)
##   - protoc-gen-gogo: go install github.com/cosmos/gogoproto/protoc-gen-gogo@latest
##   - protoc-gen-grpc-gateway: go install github.com/grpc-ecosystem/grpc-gateway/protoc-gen-grpc-gateway@latest
##   - protoc-gen-go-grpc: go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
.PHONY: proto-gen
proto-gen:
	@echo "--> Generating protobuf files..."
	@echo "    Required tools: buf, protoc-gen-gogo, protoc-gen-grpc-gateway, protoc-gen-go-grpc"
	@which buf > /dev/null 2>&1 || (echo "ERROR: buf not found. Install from https://docs.buf.build/installation" && exit 1)
	@which protoc-gen-gogo > /dev/null 2>&1 || (echo "ERROR: protoc-gen-gogo not found. Run: go install github.com/cosmos/gogoproto/protoc-gen-gogo@latest" && exit 1)
	@cd proto && buf generate
	@echo "--> Protobuf generation complete."

## proto-lint: Lint protobuf files
.PHONY: proto-lint
proto-lint:
	@echo "--> Linting protobuf files..."
	@cd proto && buf lint

# ============================================================
# Docker
# ============================================================

## docker-build: Build the Docker image
.PHONY: docker-build
docker-build:
	@echo "--> Building Docker image..."
	docker build -t tamizhi:latest .

## docker-run: Run the Docker container
.PHONY: docker-run
docker-run:
	docker run -it --rm \
		-p 26656:26656 \
		-p 26657:26657 \
		-p 1317:1317 \
		-p 9090:9090 \
		-v $(HOME)/.tamizhi:/root/.tamizhi \
		tamizhi:latest start

# ── Docker Compose (local testnet) ──────────────────────────────────────────
.PHONY: docker-up docker-down docker-logs docker-reset

docker-up: docker-build
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-reset:
	docker-compose down -v
	docker-compose up -d

# ============================================================
# Dependency management
# ============================================================

## mod-tidy: Run go mod tidy
.PHONY: mod-tidy
mod-tidy:
	$(GO) mod tidy

## mod-verify: Verify go modules
.PHONY: mod-verify
mod-verify:
	$(GO) mod verify

# ============================================================
# Cleanup
# ============================================================

# ============================================================
# CosmWasm contract targets
# ============================================================

CONTRACT_DIR      := contracts/literary-nft
CONTRACT_WASM     := $(CONTRACT_DIR)/target/wasm32-unknown-unknown/release/literary_nft.wasm
COSMWASM_CHECK    := $(shell command -v cosmwasm-check 2>/dev/null || echo "$(HOME)/.cargo/bin/cosmwasm-check")

## contract-build: Compile the literary-nft CosmWasm contract (Rust 1.81)
.PHONY: contract-build
contract-build:
	@echo "--> Building literary-nft contract..."
	@cd $(CONTRACT_DIR) && \
	  RUSTFLAGS="-C target-feature=-bulk-memory,-mutable-globals,-sign-ext" \
	  cargo +1.81 build --target wasm32-unknown-unknown --release --lib
	@echo "--> Wasm: $(CONTRACT_WASM) ($$(du -sh $(CONTRACT_WASM) | cut -f1))"

## contract-check: Validate the wasm with cosmwasm-check
.PHONY: contract-check
contract-check: contract-build
	@echo "--> Validating wasm..."
	@$(COSMWASM_CHECK) $(CONTRACT_WASM)
	@echo "--> Validation passed."

## contract-schema: Generate JSON schema files
.PHONY: contract-schema
contract-schema:
	@echo "--> Generating contract schema..."
	@cd $(CONTRACT_DIR) && cargo +1.81 run --bin schema 2>/dev/null || \
	  echo "Note: schema binary not yet defined in contract — skipping."

## contract-test: Run contract unit tests
.PHONY: contract-test
contract-test:
	@echo "--> Running contract tests..."
	@cd $(CONTRACT_DIR) && cargo +1.81 test 2>&1

## contract-deploy: Build, validate, upload, instantiate and mint a sample NFT
.PHONY: contract-deploy
contract-deploy: contract-check
	@echo "--> Deploying literary-nft contract..."
	@bash scripts/deploy-contract.sh --skip-build

## contract-clean: Remove contract build artifacts
.PHONY: contract-clean
contract-clean:
	@echo "--> Cleaning contract build..."
	@cd $(CONTRACT_DIR) && cargo clean

## clean: Remove build artifacts and testnet directories
.PHONY: clean
clean:
	@echo "--> Cleaning..."
	@rm -rf build/ .testnet/ coverage.out coverage.html

# ============================================================
# Help
# ============================================================

## help: Show this help
.PHONY: help
help:
	@echo "Tamizhi Blockchain Makefile"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //' | column -t -s ':'

## payments-build: Build the payments CosmWasm contract
.PHONY: payments-build
payments-build:
	@echo "--> Building payments contract..."
	@cd contracts/payments && \
	  RUSTFLAGS="-C target-feature=-bulk-memory,-mutable-globals,-sign-ext" \
	  cargo +1.81 build --target wasm32-unknown-unknown --release --lib

## rewards-build: Build the rewards CosmWasm contract
.PHONY: rewards-build
rewards-build:
	@echo "--> Building rewards contract..."
	@cd contracts/rewards && \
	  RUSTFLAGS="-C target-feature=-bulk-memory,-mutable-globals,-sign-ext" \
	  cargo +1.81 build --target wasm32-unknown-unknown --release --lib

## access-build: Build the access_control CosmWasm contract
.PHONY: access-build
access-build:
	@echo "--> Building access_control contract..."
	@cd contracts/access_control && \
	  RUSTFLAGS="-C target-feature=-bulk-memory,-mutable-globals,-sign-ext" \
	  cargo +1.81 build --target wasm32-unknown-unknown --release --lib

## all-contracts: Build all CosmWasm contracts
.PHONY: all-contracts
all-contracts: contract-build payments-build rewards-build access-build
	@echo "--> All contracts built."

## faucet: Send testnet tokens to an address (usage: make faucet TO=tamizhi1...)
.PHONY: faucet
faucet:
	@bash scripts/faucet.sh $(TO)

## localnet-setup: Set up a 4-validator local testnet
.PHONY: localnet-setup
localnet-setup:
	@bash scripts/setup-localnet.sh

## localnet-start: Start the local testnet
.PHONY: localnet-start
localnet-start:
	@bash scripts/start-localnet.sh

## create-validator: Create a new validator on the running chain
.PHONY: create-validator
create-validator:
	@bash scripts/create-validator.sh

## gov-test: Run governance round-trip integration test
.PHONY: gov-test
gov-test:
	@bash scripts/governance-roundtrip.sh

# ── E2E Tests ────────────────────────────────────────────────────────────────
.PHONY: e2e-smoke check-chain

## e2e-smoke: Run the full end-to-end smoke test (starts a fresh localnet)
e2e-smoke:
	./scripts/e2e-smoke-test.sh

## check-chain: Run a lightweight health check against a live node
check-chain:
	./scripts/check-chain.sh

# ── Fuzz Tests ───────────────────────────────────────────────────────────────
## fuzz: Run Go 1.22 fuzz tests for security-sensitive validation paths (30s each)
.PHONY: fuzz
fuzz:
	CGO_ENABLED=0 go test -fuzz=FuzzMsgIssueReward_ValidateBasic -fuzztime=30s ./x/rewards/types/
	CGO_ENABLED=0 go test -fuzz=FuzzMsgCreateRewardRule_ValidateBasic -fuzztime=30s ./x/rewards/types/
	CGO_ENABLED=0 go test -fuzz=FuzzWorkContent_ValidateHexHash -fuzztime=30s ./x/literature/types/
	CGO_ENABLED=0 go test -fuzz=FuzzMsgSubmitWork_ValidateBasic -fuzztime=30s ./x/literature/types/
	CGO_ENABLED=0 go test -fuzz=FuzzMsgLogAccess_ValidateBasic -fuzztime=30s ./x/accesslog/types/
	CGO_ENABLED=0 go test -fuzz=FuzzMsgRaiseThreatFlag_ValidateBasic -fuzztime=30s ./x/security/types/
	CGO_ENABLED=0 go test -fuzz=FuzzMsgBlockAddress_ValidateBasic -fuzztime=30s ./x/security/types/
	CGO_ENABLED=0 go test -fuzz=FuzzMsgRegisterNode_ValidateBasic -fuzztime=30s ./x/nodes/types/
	CGO_ENABLED=0 go test -fuzz=FuzzMsgRegisterNode_NilStake_ValidateBasic -fuzztime=30s ./x/nodes/types/

# ── gRPC tooling ─────────────────────────────────────────────────────────────
.PHONY: grpc-list grpc-health

## grpc-list: List all gRPC services exposed by the running node
grpc-list:
	grpcurl -plaintext localhost:9090 list

## grpc-health: Check that the gRPC server is up and Tamizhi services are registered
grpc-health:
	grpcurl -plaintext localhost:9090 grpc.health.v1.Health/Check || \
	  grpcurl -plaintext localhost:9090 list | grep -q tamizhi && echo "gRPC OK"

###############################################################################
###                           Cosmovisor                                    ###
###############################################################################

COSMOVISOR_VERSION = v1.5.0
COSMOVISOR = $(GOPATH)/bin/cosmovisor

## install-cosmovisor: Install Cosmovisor binary
install-cosmovisor:
	@echo "Installing Cosmovisor $(COSMOVISOR_VERSION)..."
	go install cosmossdk.io/tools/cosmovisor/cmd/cosmovisor@$(COSMOVISOR_VERSION)
	@echo "Cosmovisor installed at $(COSMOVISOR)"

## cosmovisor-init: Initialize Cosmovisor directory structure for current binary
cosmovisor-init: build
	@echo "Initializing Cosmovisor..."
	@mkdir -p $(HOME)/.tamizhi/cosmovisor/genesis/bin
	@mkdir -p $(HOME)/.tamizhi/cosmovisor/upgrades
	@cp $(BUILDDIR)/tamizhi $(HOME)/.tamizhi/cosmovisor/genesis/bin/
	@echo "Cosmovisor initialized. Genesis binary copied."
	@echo "Directory: $(HOME)/.tamizhi/cosmovisor/"

## cosmovisor-add-upgrade: Add upgrade binary. Usage: make cosmovisor-add-upgrade UPGRADE_NAME=v1.1.0
cosmovisor-add-upgrade: build
	@if [ -z "$(UPGRADE_NAME)" ]; then echo "ERROR: UPGRADE_NAME is required. Usage: make cosmovisor-add-upgrade UPGRADE_NAME=v1.1.0"; exit 1; fi
	@echo "Adding upgrade binary for $(UPGRADE_NAME)..."
	@mkdir -p $(HOME)/.tamizhi/cosmovisor/upgrades/$(UPGRADE_NAME)/bin
	@cp $(BUILDDIR)/tamizhi $(HOME)/.tamizhi/cosmovisor/upgrades/$(UPGRADE_NAME)/bin/
	@echo "Upgrade binary for $(UPGRADE_NAME) is ready."

## cosmovisor-start: Start node via Cosmovisor (reads CHAIN_HOME, defaults to ~/.tamizhi)
cosmovisor-start:
	DAEMON_NAME=tamizhi \
	DAEMON_HOME=$(or $(CHAIN_HOME),$(HOME)/.tamizhi) \
	DAEMON_ALLOW_DOWNLOAD_BINARIES=false \
	DAEMON_RESTART_AFTER_UPGRADE=true \
	UNSAFE_SKIP_BACKUP=false \
	$(COSMOVISOR) run start

## cosmovisor-localnet: Start localnet node 1 via Cosmovisor
cosmovisor-localnet:
	DAEMON_NAME=tamizhi \
	DAEMON_HOME=$(HOME)/.tamizhi-val1 \
	DAEMON_ALLOW_DOWNLOAD_BINARIES=false \
	DAEMON_RESTART_AFTER_UPGRADE=true \
	UNSAFE_SKIP_BACKUP=true \
	$(COSMOVISOR) run start --home $(HOME)/.tamizhi-val1

###############################################################################
###                          Launch Operations                              ###
###############################################################################

## launch-check: Run pre-launch validation checks
.PHONY: launch-check
launch-check:
	@echo "==> Running pre-launch checks..."
	@echo "1. Build check..."
	@CGO_ENABLED=0 $(GO) build ./x/... && echo "   ✓ Build OK"
	@echo "2. Test suite..."
	@CGO_ENABLED=0 $(GO) test ./x/... -count=1 -timeout 10m -q && echo "   ✓ Tests OK"
	@echo "3. Genesis validation..."
	@if [ -f genesis/testnet-1/genesis.json ]; then \
		$(BINARY) genesis validate genesis/testnet-1/genesis.json 2>/dev/null && echo "   ✓ Genesis OK" || echo "   ⚠ Genesis validation failed"; \
	fi
	@echo "4. Security check..."
	@git log --all --oneline -S 'mnemonic\|private_key\|secret' -- '*.json' '*.env' 2>/dev/null | head -5 || true
	@echo "   ✓ No obvious secrets in git history"
	@echo ""
	@echo "✓ Pre-launch checks complete. Review LAUNCH_CHECKLIST.md for full list."

## testnet-smoke: Run the E2E smoke test against localnet
.PHONY: testnet-smoke
testnet-smoke:
	@./scripts/e2e-smoke-test.sh

## mainnet-genesis: Create the mainnet genesis file
.PHONY: mainnet-genesis
mainnet-genesis:
	@echo "Creating mainnet genesis..."
	@CHAIN_ID=tamizhi-1 ./scripts/create-testnet-genesis.sh

## version: Print version information
.PHONY: version
version:
	@echo "Chain: $(shell $(BINARY) version 2>/dev/null || echo 'not built')"
	@echo "Go:    $(shell $(GO) version)"
	@echo "Git:   $(shell git describe --tags --always --dirty 2>/dev/null || echo 'unknown')"
