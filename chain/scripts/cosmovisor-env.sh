#!/usr/bin/env bash
# Source this file: source scripts/cosmovisor-env.sh

export DAEMON_NAME="tamizhi"
export DAEMON_HOME="${CHAIN_HOME:-$HOME/.tamizhi}"
export DAEMON_ALLOW_DOWNLOAD_BINARIES="false"
export DAEMON_RESTART_AFTER_UPGRADE="true"
export DAEMON_POLL_INTERVAL="300ms"
export DAEMON_RESTART_DELAY="1s"
export UNSAFE_SKIP_BACKUP="false"
export DAEMON_BACKUP_DIR="${DAEMON_HOME}/cosmovisor/backup"

# Prometheus
export DAEMON_METRICS_ADDR="localhost:9093"

echo "Cosmovisor environment set for daemon: $DAEMON_NAME"
echo "Daemon home: $DAEMON_HOME"
