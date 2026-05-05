#!/usr/bin/env bash
# Build the rewards escrow CosmWasm contract to WASM
# Requires: Rust with wasm32-unknown-unknown target installed
# Install: rustup target add wasm32-unknown-unknown
# Optionally: cargo install cosmwasm-check
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
OUTPUT_DIR="$ROOT_DIR/build/contracts"

mkdir -p "$OUTPUT_DIR"

echo "=== Building tamizhi-rewards-escrow ==="
cd "$CONTRACTS_DIR/rewards"

cargo build --release --target wasm32-unknown-unknown --lib

WASM_FILE="../../target/wasm32-unknown-unknown/release/tamizhi_rewards_escrow.wasm"
if [ -f "$WASM_FILE" ]; then
    cp "$WASM_FILE" "$OUTPUT_DIR/tamizhi_rewards_escrow.wasm"
    echo "✓ Built: $OUTPUT_DIR/tamizhi_rewards_escrow.wasm"

    # Optimize if cosmwasm-optimizer is available
    if command -v cosmwasm-check &>/dev/null; then
        cosmwasm-check "$OUTPUT_DIR/tamizhi_rewards_escrow.wasm"
        echo "✓ Validation passed"
    fi

    ls -lh "$OUTPUT_DIR/tamizhi_rewards_escrow.wasm"
else
    echo "✗ Build failed — wasm file not found"
    exit 1
fi

echo ""
echo "=== Done ==="
echo "Deploy with:"
echo "  tamizhi tx wasm store $OUTPUT_DIR/tamizhi_rewards_escrow.wasm \\"
echo "    --from validator --gas auto --gas-adjustment 1.5 --fees 50000utmz --yes"
