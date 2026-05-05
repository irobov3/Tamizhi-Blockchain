#!/usr/bin/env bash
# Quick chain health and connectivity check.
# Usage: ./scripts/check-chain.sh [node-rpc-url] [rest-url]
# Defaults: localhost:26657 / localhost:1317

RPC="${1:-http://localhost:26657}"
REST="${2:-http://localhost:1317}"
BINARY="${BINARY:-tamizhi}"

echo "=== Tamizhi Chain Health Check ==="
echo "RPC:  $RPC"
echo "REST: $REST"
echo ""

# RPC health
if curl -sf "$RPC/health" > /dev/null 2>&1; then
  echo "✓ RPC health endpoint OK"
else
  echo "✗ RPC health endpoint FAILED"
fi

# Block height
HEIGHT=$(curl -sf "$RPC/status" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['sync_info']['latest_block_height'])" 2>/dev/null || echo "unknown")
echo "✓ Latest block height: $HEIGHT"

# REST API checks
for path in \
  "/tamizhi/rewards/v1/rules" \
  "/tamizhi/nodes/v1/nodes" \
  "/tamizhi/accesslog/v1/logs" \
  "/tamizhi/security/v1/threats" \
  "/tamizhi/messaging/v1/nodes"; do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$REST$path" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "✓ REST $path → $STATUS"
  else
    echo "✗ REST $path → $STATUS"
  fi
done

echo ""
echo "=== Done ==="
