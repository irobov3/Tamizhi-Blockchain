#!/usr/bin/env bash
# Take a manual snapshot of chain state for distribution
# Requires the node to be stopped or have snapshots enabled in app.toml

set -euo pipefail

CHAIN_HOME="${1:-$HOME/.tamizhi}"
OUTPUT_DIR="${2:-./snapshots}"
BINARY="${BINARY:-tamizhi}"

mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_FILE="$OUTPUT_DIR/tamizhi-snapshot-${TIMESTAMP}.tar.lz4"

echo "==> Taking chain snapshot"
echo "    Home:   $CHAIN_HOME"
echo "    Output: $SNAPSHOT_FILE"

# Get current block height
HEIGHT=$(curl -s http://localhost:26657/status | jq -r '.result.sync_info.latest_block_height' || echo "unknown")
echo "    Height: $HEIGHT"

# Compress the data directory (excluding the WAL and peer store)
echo "    Compressing..."
tar --use-compress-program=lz4 \
    --exclude="$CHAIN_HOME/data/cs.wal" \
    --exclude="$CHAIN_HOME/data/evidence.db" \
    -cf "$SNAPSHOT_FILE" \
    -C "$(dirname $CHAIN_HOME)" \
    "$(basename $CHAIN_HOME)/data"

SIZE=$(du -sh "$SNAPSHOT_FILE" | cut -f1)
SHA256=$(sha256sum "$SNAPSHOT_FILE" | cut -d' ' -f1)

echo ""
echo "✓ Snapshot created:"
echo "  File:   $SNAPSHOT_FILE"
echo "  Size:   $SIZE"
echo "  Height: $HEIGHT"
echo "  SHA256: $SHA256"
echo ""
echo "==> Share these details with validators:"
echo "  Snapshot URL: <upload to S3/IPFS>"
echo "  SHA256: $SHA256"
echo "  Height: $HEIGHT"

# Save metadata
cat > "$OUTPUT_DIR/snapshot-${TIMESTAMP}.json" <<EOF
{
  "file": "tamizhi-snapshot-${TIMESTAMP}.tar.lz4",
  "height": "$HEIGHT",
  "timestamp": "$TIMESTAMP",
  "sha256": "$SHA256",
  "size": "$SIZE",
  "chain_id": "${CHAIN_ID:-tamizhi-testnet-1}"
}
EOF
