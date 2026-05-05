#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Tamizhi Ecosystem — Reset Script
# Stops all containers, optionally removes volumes, re-runs setup
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "$ROOT_DIR"

echo ""
echo "======================================================"
echo "  Tamizhi Ecosystem — Reset"
echo "======================================================"
echo ""

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
# Confirmation prompt
# ─────────────────────────────────────────────────────────────
echo "WARNING: This will stop all Tamizhi containers."
echo ""

read -r -p "Do you also want to DELETE all data volumes (postgres, redis, ipfs, chain)? [y/N]: " DELETE_VOLUMES
echo ""

REMOVE_VOLUMES=false
if [[ "$DELETE_VOLUMES" =~ ^[Yy]$ ]]; then
  echo "WARNING: ALL DATA WILL BE PERMANENTLY DELETED."
  read -r -p "Are you absolutely sure? Type 'yes' to confirm: " CONFIRM
  if [ "$CONFIRM" = "yes" ]; then
    REMOVE_VOLUMES=true
    echo ""
    echo "Confirmed. Volumes will be removed."
  else
    echo "Volume deletion cancelled. Only containers will be stopped."
  fi
fi

echo ""

# ─────────────────────────────────────────────────────────────
# Stop all containers
# ─────────────────────────────────────────────────────────────
echo "Stopping all containers..."
$COMPOSE_CMD down --remove-orphans || true
echo "  Containers stopped."

# ─────────────────────────────────────────────────────────────
# Remove volumes if confirmed
# ─────────────────────────────────────────────────────────────
if [ "$REMOVE_VOLUMES" = true ]; then
  echo ""
  echo "Removing Docker volumes..."
  $COMPOSE_CMD down --volumes --remove-orphans || true

  # Also prune named volumes explicitly
  docker volume rm tamizhi_postgres_data tamizhi_redis_data tamizhi_ipfs_data tamizhi_chain_data 2>/dev/null || true
  echo "  Volumes removed."
fi

# ─────────────────────────────────────────────────────────────
# Clean dist/build artifacts
# ─────────────────────────────────────────────────────────────
echo ""
echo "Cleaning build artifacts..."
find . -name "dist" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name ".next" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
echo "  Build artifacts cleaned."

# ─────────────────────────────────────────────────────────────
# Re-run setup
# ─────────────────────────────────────────────────────────────
echo ""
echo "Re-running setup..."
echo ""

bash "${SCRIPT_DIR}/setup.sh"
