#!/usr/bin/env bash
# ============================================================
# Tamizhi — Full Stack Launch Script
#
# Modes:
#   ./scripts/launch.sh dev       Local development (chain + services)
#   ./scripts/launch.sh testnet   Testnet node + all services via Docker
#   ./scripts/launch.sh services  Docker services only (assumes chain running)
#   ./scripts/launch.sh chain     Chain only (no Docker services)
#   ./scripts/launch.sh contract  Deploy CosmWasm contract (chain must be live)
#   ./scripts/launch.sh check     Prerequisites check only
# ============================================================
set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}   $*"; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*" >&2; exit 1; }
sep()  { echo -e "${BLUE}────────────────────────────────────────────────────${NC}"; }

MODE="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CHAIN_DIR="$ROOT_DIR/chain"
ENV_FILE="$ROOT_DIR/.env"

# ── Load .env if present ──────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | grep '=' | xargs)
  info "Loaded env from $ENV_FILE"
fi

# ── Prerequisites check ───────────────────────────────────────────────────────
check_prerequisites() {
  sep; info "Checking prerequisites..."
  local missing=0

  check_cmd() {
    if command -v "$1" &>/dev/null; then ok "$1 found ($(command -v "$1"))";
    else warn "$1 NOT found — $2"; missing=$((missing+1)); fi
  }

  check_cmd go        "Install from https://go.dev/dl/ (need 1.21+)"
  check_cmd docker    "Install from https://docker.com"
  check_cmd docker    "Need Docker Compose v2 (docker compose)"
  check_cmd node      "Install Node.js 20+ from https://nodejs.org"
  check_cmd npm       "Comes with Node.js"
  check_cmd cargo     "Install Rust from https://rustup.rs"
  check_cmd jq        "Install: brew install jq  OR  apt install jq"

  # Go version
  if command -v go &>/dev/null; then
    GO_VER=$(go version | awk '{print $3}' | sed 's/go//')
    ok "Go version: $GO_VER"
  fi

  # Node version
  if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    ok "Node version: $NODE_VER"
  fi

  # Rust toolchain 1.81
  if command -v rustup &>/dev/null; then
    if rustup toolchain list 2>/dev/null | grep -q "1.81"; then
      ok "Rust 1.81 toolchain present"
    else
      warn "Rust 1.81 not found — install with: rustup install 1.81 && rustup target add wasm32-unknown-unknown --toolchain 1.81"
      missing=$((missing+1))
    fi
  fi

  # cosmwasm-check
  if command -v cosmwasm-check &>/dev/null || [[ -x "$HOME/.cargo/bin/cosmwasm-check" ]]; then
    ok "cosmwasm-check found"
  else
    warn "cosmwasm-check not found — install with: cargo install cosmwasm-check --version 2.1.3"
    missing=$((missing+1))
  fi

  sep
  if [[ $missing -eq 0 ]]; then ok "All prerequisites met.";
  else warn "$missing prerequisite(s) missing. Install them before proceeding."; fi
}

# ── Build chain binary ────────────────────────────────────────────────────────
build_chain() {
  sep; info "Building tamizhi binary..."
  cd "$CHAIN_DIR"
  make build
  ok "Binary built at chain/build/tamizhi"
  # Make available on PATH for this session
  export PATH="$CHAIN_DIR/build:$PATH"
}

# ── Init chain node ───────────────────────────────────────────────────────────
init_chain() {
  sep; info "Initializing chain node..."
  cd "$CHAIN_DIR"
  if [[ -f "$HOME/.tamizhi/config/genesis.json" ]]; then
    warn "Node already initialized at ~/.tamizhi — skipping (use 'make reset' to start fresh)"
  else
    make init
    ok "Chain initialized. Mnemonic saved to /tmp/tamizhi-genesis-key.txt — BACK IT UP!"
  fi
}

# ── Start chain node in background ───────────────────────────────────────────
start_chain() {
  sep; info "Starting chain node..."
  export PATH="$CHAIN_DIR/build:$PATH"
  cd "$CHAIN_DIR"

  if pgrep -x tamizhi &>/dev/null; then
    warn "tamizhi process already running (PID $(pgrep -x tamizhi))"
    return
  fi

  nohup tamizhi start \
    --home "$HOME/.tamizhi" \
    --minimum-gas-prices 0.001utmz \
    --api.enable \
    --api.swagger \
    --grpc.enable \
    > /tmp/tamizhi-node.log 2>&1 &

  NODE_PID=$!
  info "Node started (PID $NODE_PID) — logs at /tmp/tamizhi-node.log"

  # Wait for RPC to be ready
  info "Waiting for RPC to be ready..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:26657/status &>/dev/null; then
      ok "Node RPC is live at http://localhost:26657"
      return
    fi
    sleep 2
  done
  fail "Node did not start in 60s — check /tmp/tamizhi-node.log"
}

# ── Deploy CosmWasm contract ──────────────────────────────────────────────────
deploy_contract() {
  sep; info "Deploying literary-nft CosmWasm contract..."
  export PATH="$CHAIN_DIR/build:$PATH"
  cd "$CHAIN_DIR"

  # Build + check
  make contract-check

  # Deploy (uploads, instantiates, mints sample)
  bash scripts/deploy-contract.sh --skip-build

  # Extract contract address from output (deploy script prints it)
  CONTRACT_ADDR=$(tamizhi query wasm list-contract-by-code 1 \
    --node http://localhost:26657 --output json 2>/dev/null \
    | jq -r '.contracts[-1] // empty')

  if [[ -n "$CONTRACT_ADDR" ]]; then
    ok "Contract deployed at: $CONTRACT_ADDR"
    # Write to .env
    if [[ -f "$ENV_FILE" ]]; then
      sed -i.bak "s|^NEXT_PUBLIC_NFT_CONTRACT=.*|NEXT_PUBLIC_NFT_CONTRACT=$CONTRACT_ADDR|" "$ENV_FILE"
    else
      echo "NEXT_PUBLIC_NFT_CONTRACT=$CONTRACT_ADDR" >> "$ENV_FILE"
    fi
    ok "NEXT_PUBLIC_NFT_CONTRACT written to $ENV_FILE"
    warn "Restart Docker services for web app to pick up the new contract address."
  else
    warn "Could not auto-detect contract address. Set NEXT_PUBLIC_NFT_CONTRACT manually in .env"
  fi
}

# ── Start Docker services ─────────────────────────────────────────────────────
start_services() {
  sep; info "Starting Docker services..."
  cd "$ROOT_DIR"

  if ! docker info &>/dev/null; then
    fail "Docker is not running. Start Docker Desktop and retry."
  fi

  docker compose pull --quiet 2>/dev/null || true
  docker compose up -d --build

  # Wait for web to be ready
  info "Waiting for web app..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3000 &>/dev/null; then
      ok "Web app live at http://localhost:3000"
      break
    fi
    sleep 3
  done

  # Print service URLs
  sep
  echo -e "${GREEN}Services running:${NC}"
  echo "  Web App       → http://localhost:3000"
  echo "  API           → http://localhost:3001/api"
  echo "  API Docs      → http://localhost:3001/api/docs"
  echo "  Chain RPC     → http://localhost:26657"
  echo "  Chain REST    → http://localhost:1317"
  echo "  Chain gRPC    → http://localhost:9090"
  echo "  IPFS Gateway  → http://localhost:8080"
  sep
}

# ── Stop everything ───────────────────────────────────────────────────────────
stop_all() {
  sep; info "Stopping all services..."
  cd "$ROOT_DIR"
  docker compose down
  pkill -x tamizhi 2>/dev/null && ok "tamizhi node stopped" || true
  ok "All stopped."
}

# ── Generate / validate .env ──────────────────────────────────────────────────
ensure_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    warn ".env not found — copying from .env.example"
    cp "$ROOT_DIR/.env.example" "$ENV_FILE" 2>/dev/null || \
    cp "$ROOT_DIR/web/.env.example" "$ENV_FILE" 2>/dev/null || true
    warn "Edit $ENV_FILE and fill in secrets before continuing."
  fi
}

# ── Main dispatch ─────────────────────────────────────────────────────────────
sep
echo -e "${BLUE}Tamizhi Launch Script — mode: ${YELLOW}$MODE${NC}"
sep

case "$MODE" in
  check)
    check_prerequisites
    ;;

  chain)
    check_prerequisites
    ensure_env
    build_chain
    init_chain
    start_chain
    ;;

  services)
    ensure_env
    start_services
    ;;

  contract)
    ensure_env
    deploy_contract
    ;;

  dev)
    check_prerequisites
    ensure_env
    build_chain
    init_chain
    start_chain
    start_services
    sep
    ok "Development stack is live!"
    echo ""
    echo "  Next steps:"
    echo "  1. Deploy contract:  ./scripts/launch.sh contract"
    echo "  2. Open wallet:      http://localhost:3000/wallet"
    echo "  3. View explorer:    http://localhost:3000/explorer"
    echo "  4. Node logs:        tail -f /tmp/tamizhi-node.log"
    sep
    ;;

  testnet)
    ensure_env
    start_services
    info "For testnet, the chain node runs inside Docker (tamizhi-node container)."
    info "Use docker compose logs -f tamizhi-node to follow chain logs."
    ;;

  stop)
    stop_all
    ;;

  *)
    echo "Usage: $0 {check|chain|services|contract|dev|testnet|stop}"
    exit 1
    ;;
esac
