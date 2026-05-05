#!/usr/bin/env bash
# Display the P2P peer info for a running localnet.
echo "=== Tamizhi Localnet P2P Peers ==="
for node in val1 val2 seed; do
  if [ -f "/data/${node}_nodeid.txt" ] 2>/dev/null; then
    ID=$(cat "/data/${node}_nodeid.txt")
    echo "${node}: ${ID}@${node}:26656"
  fi
done

# Live status from RPC
for port in 26657 26661; do
  echo ""
  echo "--- Node at port $port ---"
  curl -sf "http://localhost:${port}/net_info" 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); peers=d['result']['peers']; print(f'Connected peers: {len(peers)}'); [print(f'  {p[\"node_info\"][\"id\"]}@{p[\"remote_ip\"]}') for p in peers]" 2>/dev/null || echo "  Node not reachable"
done
