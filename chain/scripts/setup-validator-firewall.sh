#!/usr/bin/env bash
# Run as root on a fresh validator node
set -euo pipefail

SSH_PORT=${SSH_PORT:-2222}
SENTRY_IPS="${SENTRY_IPS:-}"  # comma-separated

echo "==> Configuring UFW firewall for Tamizhi validator node"

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH (non-standard port)
ufw allow "${SSH_PORT}/tcp" comment "SSH"

# P2P: only allow from sentry nodes if specified
if [ -n "$SENTRY_IPS" ]; then
  IFS=',' read -ra SENTRIES <<< "$SENTRY_IPS"
  for IP in "${SENTRIES[@]}"; do
    ufw allow from "$IP" to any port 26656 comment "P2P from sentry $IP"
  done
else
  ufw allow 26656/tcp comment "P2P (public - switch to sentry-only in production)"
fi

# RPC: only localhost
ufw allow from 127.0.0.1 to any port 26657 comment "RPC localhost only"

# gRPC: only localhost
ufw allow from 127.0.0.1 to any port 9090 comment "gRPC localhost only"

# Prometheus: only monitoring server
MONITORING_IP="${MONITORING_IP:-}"
if [ -n "$MONITORING_IP" ]; then
  ufw allow from "$MONITORING_IP" to any port 26660 comment "Prometheus from monitoring"
else
  ufw allow from 127.0.0.1 to any port 26660 comment "Prometheus localhost only"
fi

ufw --force enable
ufw status verbose

echo ""
echo "Firewall configured. Remember to:"
echo "  1. Update SSH config to use port $SSH_PORT"
echo "  2. Set SENTRY_IPS for production"
echo "  3. Set MONITORING_IP for Prometheus scraping"
