#!/usr/bin/env bash
# Restore chain state from a snapshot
# Usage: ./scripts/restore-snapshot.sh <snapshot-file> [chain-home]

set -euo pipefail

SNAPSHOT_FILE="${1:-}"
CHAIN_HOME="${2:-$HOME/.tamizhi}"

if [ -z "$SNAPSHOT_FILE" ]; then
    echo "Usage: $0 <snapshot-file.tar.lz4> [chain-home]"
    exit 1
fi

if [ ! -f "$SNAPSHOT_FILE" ]; then
    echo "ERROR: Snapshot file not found: $SNAPSHOT_FILE"
    exit 1
fi

echo "==> Restoring snapshot"
echo "    File:  $SNAPSHOT_FILE"
echo "    Home:  $CHAIN_HOME"
echo ""
echo "WARNING: This will overwrite existing chain data in $CHAIN_HOME/data"
read -p "Continue? [y/N] " -n 1 -r
echo ""
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

# Backup existing data
if [ -d "$CHAIN_HOME/data" ]; then
    BACKUP="$CHAIN_HOME/data.bak.$(date +%Y%m%d_%H%M%S)"
    echo "    Backing up existing data to $BACKUP..."
    mv "$CHAIN_HOME/data" "$BACKUP"
fi

# Restore
echo "    Extracting snapshot..."
tar --use-compress-program=lz4 -xf "$SNAPSHOT_FILE" -C "$(dirname $CHAIN_HOME)"

echo ""
echo "✓ Snapshot restored. Your node is ready to sync from the snapshot height."
echo "  Start with: tamizhi start --home $CHAIN_HOME"
