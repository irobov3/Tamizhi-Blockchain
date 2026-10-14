#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  setup-ssl.sh  —  Add HTTPS (Let's Encrypt) to Oracle testnet
#
#  Run AFTER deploy-to-oracle.sh AND after DNS is pointed at VM
#
#  Usage:
#    ./scripts/setup-ssl.sh <ORACLE_VM_IP> <DOMAIN> [SSH_KEY_PATH]
#
#  Example:
#    ./scripts/setup-ssl.sh 140.245.22.99 tamizhi.ai ~/.ssh/oracle_free
#
#  Domains configured (all A records must point to VM_IP first):
#    tamizhi.ai         (or whatever DOMAIN you pass)
#    rpc.tamizhi.ai
#    api.tamizhi.ai
#    explorer.tamizhi.ai
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

VM_IP="${1:-}"
DOMAIN="${2:-}"
SSH_KEY="${3:-$HOME/.ssh/id_rsa}"

[[ -z "$VM_IP" || -z "$DOMAIN" ]] && {
  echo "Usage: $0 <VM_IP> <DOMAIN> [SSH_KEY]"
  echo "Example: $0 140.245.22.99 tamizhi.ai ~/.ssh/oracle_free"
  exit 1
}

SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no"
ssh_run() { ssh $SSH_OPTS "ubuntu@$VM_IP" "$@"; }

echo "🔒 Setting up SSL for $DOMAIN on $VM_IP"

# Install certbot
ssh_run "sudo apt-get install -y -qq certbot python3-certbot-nginx"

# Write multi-domain nginx config
ssh_run "sudo tee /etc/nginx/sites-available/tamizhi > /dev/null << 'NGINX'
# ── rpc.$DOMAIN ─────────────────────────────────────────────
server {
    listen 80;
    server_name rpc.$DOMAIN;
    location / {
        proxy_pass         http://127.0.0.1:26657;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        add_header         Access-Control-Allow-Origin '*';
    }
}

# ── api.$DOMAIN ─────────────────────────────────────────────
server {
    listen 80;
    server_name api.$DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:1317;
        proxy_set_header Host \$host;
        add_header Access-Control-Allow-Origin '*';
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type';
    }
}

# ── explorer.$DOMAIN (future) ────────────────────────────────
server {
    listen 80;
    server_name explorer.$DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
    }
}

# ── $DOMAIN (landing / healthz) ─────────────────────────────
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location /healthz {
        return 200 'Tamizhi Testnet OK\n';
        add_header Content-Type text/plain;
    }
    location / {
        return 200 'Tamizhi Blockchain Testnet\n';
        add_header Content-Type text/plain;
    }
}
NGINX"

# Reload nginx
ssh_run "sudo nginx -t && sudo systemctl reload nginx"

# Certbot for all subdomains
CERT_DOMAINS="-d $DOMAIN -d www.$DOMAIN -d rpc.$DOMAIN -d api.$DOMAIN -d explorer.$DOMAIN"
echo "📜 Obtaining certificates for: $CERT_DOMAINS"
echo "   (Make sure ALL DNS A records point to $VM_IP before continuing)"
read -rp "   DNS ready? Press Enter to continue…"

ssh_run "sudo certbot --nginx $CERT_DOMAINS --non-interactive --agree-tos -m admin@$DOMAIN --redirect"

# Auto-renew cron
ssh_run "sudo systemctl enable certbot.timer && sudo systemctl start certbot.timer"

echo ""
echo "✅ HTTPS configured!"
echo "   RPC  → https://rpc.$DOMAIN"
echo "   API  → https://api.$DOMAIN"
echo "   Ping → https://$DOMAIN/healthz"
