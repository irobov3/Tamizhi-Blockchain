#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Tamizhi Ecosystem — Development Mode Launcher
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "$ROOT_DIR"

echo ""
echo "======================================================"
echo "  Tamizhi Ecosystem — Development Mode"
echo "======================================================"
echo ""

# ─────────────────────────────────────────────────────────────
# Check for concurrently
# ─────────────────────────────────────────────────────────────
if ! npx concurrently --version >/dev/null 2>&1; then
  echo "Installing concurrently..."
  npm install -g concurrently
fi

# ─────────────────────────────────────────────────────────────
# Determine compose command
# ─────────────────────────────────────────────────────────────
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  echo "ERROR: Docker Compose is required."
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Start infrastructure
# ─────────────────────────────────────────────────────────────
echo "Starting infrastructure services..."
$COMPOSE_CMD up -d postgres redis ipfs

echo "Waiting for PostgreSQL..."
MAX_TRIES=30
TRIES=0
until docker exec "$($COMPOSE_CMD ps -q postgres)" pg_isready -U tamizhi -d tamizhi >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "ERROR: PostgreSQL not ready."
    exit 1
  fi
  printf "."
  sleep 2
done
echo " ready!"

echo "Waiting for Redis..."
TRIES=0
until docker exec "$($COMPOSE_CMD ps -q redis)" redis-cli ping >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "ERROR: Redis not ready."
    exit 1
  fi
  printf "."
  sleep 1
done
echo " ready!"

echo ""
echo "Infrastructure running. Starting application services in dev mode..."
echo ""

# ─────────────────────────────────────────────────────────────
# Build command list based on what directories exist
# ─────────────────────────────────────────────────────────────
COMMANDS=()
NAMES=()
COLORS=()

if [ -d "backend" ] && [ -f "backend/package.json" ]; then
  COMMANDS+=("cd backend && npm run dev")
  NAMES+=("backend")
  COLORS+=("cyan")
fi

if [ -d "web" ] && [ -f "web/package.json" ]; then
  COMMANDS+=("cd web && npm run dev")
  NAMES+=("web")
  COLORS+=("blue")
fi

if [ -d "storage" ] && [ -f "storage/package.json" ]; then
  COMMANDS+=("cd storage && npm run dev")
  NAMES+=("storage")
  COLORS+=("green")
fi

if [ -d "messaging" ] && [ -f "messaging/package.json" ]; then
  COMMANDS+=("cd messaging && npm run dev")
  NAMES+=("messaging")
  COLORS+=("yellow")
fi

if [ -d "ai" ] && [ -f "ai/requirements.txt" ]; then
  if [ -d "ai/venv" ]; then
    COMMANDS+=("cd ai && source venv/bin/activate && python -m uvicorn main:app --reload --port 8000")
  else
    COMMANDS+=("cd ai && python3 -m uvicorn main:app --reload --port 8000")
  fi
  NAMES+=("ai")
  COLORS+=("magenta")
fi

# ─────────────────────────────────────────────────────────────
# Run all services concurrently
# ─────────────────────────────────────────────────────────────
if [ ${#COMMANDS[@]} -eq 0 ]; then
  echo "WARNING: No application services found to start."
  exit 0
fi

# Build concurrently arguments
CONCURRENTLY_ARGS=()
for i in "${!COMMANDS[@]}"; do
  CONCURRENTLY_ARGS+=("--names" "${NAMES[$i]}")
done

echo "Starting services: ${NAMES[*]}"
echo ""

# Use npx concurrently with proper quoting
CMD_STRING=""
for i in "${!COMMANDS[@]}"; do
  if [ $i -gt 0 ]; then
    CMD_STRING+=" "
  fi
  CMD_STRING+="\"${COMMANDS[$i]}\""
done

COLOR_LIST=$(IFS=,; echo "${COLORS[*]}")
NAME_LIST=$(IFS=,; echo "${NAMES[*]}")

eval npx concurrently \
  --kill-others-on-fail \
  --prefix-colors "$COLOR_LIST" \
  --names "$NAME_LIST" \
  $CMD_STRING

echo ""
echo "All services stopped."
