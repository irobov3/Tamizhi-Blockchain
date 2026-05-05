#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Tamizhi Ecosystem — Full Setup Script
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "$ROOT_DIR"

echo ""
echo "======================================================"
echo "  Tamizhi Ecosystem — Setup"
echo "======================================================"
echo ""

# ─────────────────────────────────────────────────────────────
# Dependency checks
# ─────────────────────────────────────────────────────────────
echo "Checking dependencies..."

command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required but not installed. See https://docs.docker.com/get-docker/"; exit 1; }

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  echo "ERROR: Docker Compose is required. See https://docs.docker.com/compose/install/"
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js 20+ is required. See https://nodejs.org/"; exit 1; }

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node.js 20+ required (found $(node --version))"
  exit 1
fi

command -v npm >/dev/null 2>&1 || { echo "ERROR: npm is required."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3 is required for the AI service."; exit 1; }

echo "  Docker:  $(docker --version)"
echo "  Compose: $($COMPOSE_CMD version)"
echo "  Node:    $(node --version)"
echo "  npm:     $(npm --version)"
echo "  Python:  $(python3 --version)"
echo ""

# ─────────────────────────────────────────────────────────────
# Copy .env files (skip if already exist)
# ─────────────────────────────────────────────────────────────
echo "Setting up environment files..."

copy_env() {
  local src="$1"
  local dst="$2"
  if [ -f "$dst" ]; then
    echo "  Skipped (already exists): $dst"
  elif [ -f "$src" ]; then
    cp "$src" "$dst"
    echo "  Created: $dst"
  else
    echo "  WARNING: $src not found, skipping."
  fi
}

copy_env backend/.env.example  backend/.env
copy_env ai/.env.example       ai/.env
copy_env web/.env.example      web/.env.local
copy_env storage/.env.example  storage/.env
copy_env messaging/.env.example messaging/.env

echo ""

# ─────────────────────────────────────────────────────────────
# Install Node.js dependencies
# ─────────────────────────────────────────────────────────────
install_node_deps() {
  local dir="$1"
  if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
    echo "  Installing deps in $dir..."
    (cd "$dir" && npm install --prefer-offline 2>&1 | tail -3)
  else
    echo "  Skipped (not found): $dir"
  fi
}

echo "Installing Node.js dependencies..."
install_node_deps backend
install_node_deps web
install_node_deps storage
install_node_deps messaging

# Mobile is optional
if [ -d "mobile" ] && [ -f "mobile/package.json" ]; then
  echo "  Installing deps in mobile..."
  (cd mobile && npm install --prefer-offline 2>&1 | tail -3)
fi

echo ""

# ─────────────────────────────────────────────────────────────
# Install Python AI dependencies
# ─────────────────────────────────────────────────────────────
if [ -d "ai" ] && [ -f "ai/requirements.txt" ]; then
  echo "Installing Python AI dependencies..."
  (
    cd ai
    if [ ! -d "venv" ]; then
      python3 -m venv venv
      echo "  Created Python virtual environment."
    fi
    # shellcheck disable=SC1091
    source venv/bin/activate
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    deactivate
    echo "  AI dependencies installed."
  )
else
  echo "  Skipped AI dependencies (ai/requirements.txt not found)."
fi

echo ""

# ─────────────────────────────────────────────────────────────
# Start infrastructure services
# ─────────────────────────────────────────────────────────────
echo "Starting infrastructure services (postgres, redis, ipfs)..."
$COMPOSE_CMD up -d postgres redis ipfs

echo ""
echo "Waiting for PostgreSQL to be ready..."
MAX_TRIES=30
TRIES=0
until docker exec "$(docker compose ps -q postgres 2>/dev/null || docker-compose ps -q postgres 2>/dev/null)" \
    pg_isready -U tamizhi -d tamizhi >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "ERROR: PostgreSQL did not become ready in time."
    exit 1
  fi
  printf "."
  sleep 2
done
echo " ready!"

# ─────────────────────────────────────────────────────────────
# Database migrations
# ─────────────────────────────────────────────────────────────
if [ -d "backend" ] && [ -f "backend/package.json" ]; then
  if grep -q '"prisma"' backend/package.json 2>/dev/null; then
    echo ""
    echo "Running database migrations..."
    (
      cd backend
      npx prisma generate
      npx prisma migrate deploy
      echo "  Database migrations complete."
    )
  fi
fi

# ─────────────────────────────────────────────────────────────
# Kubernetes deployment (optional — only run when --k8s flag
# is passed or K8S_DEPLOY=true is set in the environment)
# ─────────────────────────────────────────────────────────────
K8S_DEPLOY="${K8S_DEPLOY:-false}"
for arg in "$@"; do
  case "$arg" in
    --k8s) K8S_DEPLOY=true ;;
  esac
done

if [ "$K8S_DEPLOY" = "true" ]; then
  echo ""
  echo "======================================================"
  echo "  Kubernetes Deployment"
  echo "======================================================"
  echo ""

  command -v kubectl >/dev/null 2>&1 || {
    echo "ERROR: kubectl is required for Kubernetes deployment."
    echo "  See: https://kubernetes.io/docs/tasks/tools/"
    exit 1
  }

  K8S_DIR="${ROOT_DIR}/infra/k8s"

  # ── Step K1: Namespace ─────────────────────────────────────
  echo "K1: Applying namespace..."
  kubectl apply -f "${K8S_DIR}/namespace.yaml"
  echo "  Namespace applied."
  echo ""

  # ── Step K2: Secrets (remind operator to fill values) ──────
  echo "K2: Applying secrets..."
  echo ""
  echo "  ┌─────────────────────────────────────────────────────┐"
  echo "  │  ACTION REQUIRED — Fill in secrets before deploying │"
  echo "  │                                                     │"
  echo "  │  Edit infra/k8s/secrets.yaml and replace every     │"
  echo "  │  <base64-encoded-value> placeholder:               │"
  echo "  │                                                     │"
  echo "  │    echo -n 'your-value' | base64                   │"
  echo "  │                                                     │"
  echo "  │  Secrets needed:                                    │"
  echo "  │    - JWT_SECRET      (openssl rand -hex 64)        │"
  echo "  │    - ANTHROPIC_API_KEY                             │"
  echo "  │    - DB_PASSWORD                                   │"
  echo "  └─────────────────────────────────────────────────────┘"
  echo ""
  read -rp "  Have you filled in all secret values? [y/N] " SECRETS_READY
  if [[ "$SECRETS_READY" =~ ^[Yy]$ ]]; then
    kubectl apply -f "${K8S_DIR}/secrets.yaml"
    echo "  Secrets applied."
  else
    echo "  Skipping secrets — re-run after filling values:"
    echo "    kubectl apply -f infra/k8s/secrets.yaml"
  fi
  echo ""

  # ── Step K3: Postgres and Redis ────────────────────────────
  echo "K3: Applying postgres and redis..."
  kubectl apply -f "${K8S_DIR}/postgres.yaml"
  kubectl apply -f "${K8S_DIR}/redis.yaml"
  echo "  Waiting for postgres to be ready..."
  kubectl rollout status deployment/postgres -n tamizhi --timeout=120s || \
    echo "  WARNING: postgres rollout timed out — check: kubectl get pods -n tamizhi"
  echo "  Postgres and redis applied."
  echo ""

  # ── Step K4: Chain node ────────────────────────────────────
  echo "K4: Applying chain StatefulSet..."
  kubectl apply -f "${K8S_DIR}/chain.yaml"
  echo "  Waiting for chain StatefulSet to be ready..."
  kubectl rollout status statefulset/chain -n tamizhi --timeout=180s || \
    echo "  WARNING: chain rollout timed out — check: kubectl get pods -n tamizhi"
  echo "  Chain applied."
  echo ""

  # ── Step K5: Application services ─────────────────────────
  echo "K5: Applying backend, ai, messaging, and storage..."
  kubectl apply -f "${K8S_DIR}/backend.yaml"
  kubectl apply -f "${K8S_DIR}/ai.yaml"
  kubectl apply -f "${K8S_DIR}/messaging.yaml"
  kubectl apply -f "${K8S_DIR}/storage.yaml"
  echo "  Waiting for backend rollout..."
  kubectl rollout status deployment/backend -n tamizhi --timeout=120s || \
    echo "  WARNING: backend rollout timed out"
  echo "  Waiting for ai rollout..."
  kubectl rollout status deployment/ai -n tamizhi --timeout=120s || \
    echo "  WARNING: ai rollout timed out"
  echo "  Waiting for messaging rollout..."
  kubectl rollout status deployment/messaging -n tamizhi --timeout=120s || \
    echo "  WARNING: messaging rollout timed out"
  echo "  Waiting for storage rollout..."
  kubectl rollout status deployment/storage -n tamizhi --timeout=120s || \
    echo "  WARNING: storage rollout timed out"
  echo "  Application services applied."
  echo ""

  # ── Step K6: Web frontend ──────────────────────────────────
  echo "K6: Applying web frontend..."
  kubectl apply -f "${K8S_DIR}/web.yaml"
  kubectl rollout status deployment/web -n tamizhi --timeout=120s || \
    echo "  WARNING: web rollout timed out"
  echo "  Web applied."
  echo ""

  # ── Step K7: Ingress ───────────────────────────────────────
  echo "K7: Applying ingress..."
  echo "  NOTE: cert-manager ClusterIssuer 'letsencrypt-prod' must exist."
  echo "  Install cert-manager first if not present:"
  echo "    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml"
  kubectl apply -f "${K8S_DIR}/ingress.yaml"
  echo "  Ingress applied."
  echo ""

  echo "======================================================"
  echo "  Kubernetes deployment complete!"
  echo "======================================================"
  echo ""
  echo "Check pod status:"
  echo "  kubectl get pods -n tamizhi"
  echo ""
  echo "Check ingress:"
  echo "  kubectl get ingress -n tamizhi"
  echo ""
  echo "Production URLs (after DNS is configured):"
  echo "  https://tamizhi.network        — Web App"
  echo "  https://api.tamizhi.network    — Backend API"
  echo "  https://rpc.tamizhi.network    — Chain RPC"
  echo "  https://rest.tamizhi.network   — Chain REST"
  echo "  https://ai.tamizhi.network     — AI Service"
  echo "  wss://msg.tamizhi.network      — Messaging"
  echo "  https://storage.tamizhi.network — Storage"
  echo ""
fi

# ─────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  Setup complete!"
echo "======================================================"
echo ""
echo "Next steps:"
echo "  Start all services:     docker compose up"
echo "  Start dev mode:         ./infra/scripts/start-dev.sh"
echo "  Deploy to Kubernetes:   ./infra/scripts/setup.sh --k8s"
echo "                       or K8S_DEPLOY=true ./infra/scripts/setup.sh"
echo ""
echo "Local service URLs:"
echo "  Web App:    http://localhost:3000"
echo "  API:        http://localhost:3001"
echo "  AI:         http://localhost:8000"
echo "  Messaging:  ws://localhost:4000"
echo "  Storage:    http://localhost:5000"
echo "  Chain RPC:  http://localhost:26657"
echo "  Chain LCD:  http://localhost:1317"
echo "  IPFS GW:    http://localhost:8080"
echo "  Nginx:      http://localhost:80"
echo ""
