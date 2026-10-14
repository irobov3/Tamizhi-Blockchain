# Tamizhi Chain — Prometheus Metrics Reference

All metrics are emitted via the Cosmos SDK telemetry package (wrapping HashiCorp go-metrics).
The Prometheus exporter prefixes every metric name with the module path and normalises
separators, so `tamizhi_rewards_issued` appears as
`tamizhi_rewards_issued_total` in a typical Prometheus scrape.

Enable the telemetry endpoint in `app.toml`:

```toml
[telemetry]
enabled = true
enable-hostname = false
enable-hostname-label = false
enable-service-label = false
prometheus-retention-time = 60   # seconds; 0 = disabled
```

---

## Metric Catalogue

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `tamizhi_rewards_issued` | counter | `rule_id` | Total rewards successfully issued |
| `tamizhi_daily_limit_hit` | counter | `rule_id` | Times a per-day reward cap was reached |
| `tamizhi_rules_created` | counter | — | Reward rules created via governance |
| `tamizhi_nodes_registered` | counter | `swarm_id` | Service nodes successfully registered |
| `tamizhi_nodes_jailed` | counter | — | Nodes jailed for low uptime |
| `tamizhi_nodes_slashed` | counter | — | Nodes slashed for misbehaviour |
| `tamizhi_node_rewards_claimed` | counter | — | Node reward claims processed |
| `tamizhi_threat_flags_raised` | counter | `type`, `level` | Threat flags raised by the security module |
| `tamizhi_threat_flags_resolved` | counter | — | Threat flags resolved |
| `tamizhi_access_logs_written` | counter | `action` | Access log entries written |
| `tamizhi_ante_blocked_txs` | counter | — | Transactions blocked by the security blocklist |
| `tamizhi_ante_rate_limited` | counter | — | Transactions rejected by the per-block rate limiter |
| `tamizhi_ante_insufficient_fee` | counter | — | Transactions rejected for insufficient fee |

---

## Prometheus Query Examples

### Rewards

```promql
# Total rewards issued over the last hour
increase(tamizhi_rewards_issued_total[1h])

# Per-rule reward rate (top 5 rules)
topk(5, rate(tamizhi_rewards_issued_total[5m]))

# Daily limit hit rate by rule
rate(tamizhi_daily_limit_hit_total[5m])

# Rules created (all time)
tamizhi_rules_created_total
```

### Nodes

```promql
# Node registration rate
rate(tamizhi_nodes_registered_total[10m])

# Nodes jailed in the last 24 h
increase(tamizhi_nodes_jailed_total[24h])

# Nodes slashed in the last 24 h
increase(tamizhi_nodes_slashed_total[24h])

# Node reward claim rate
rate(tamizhi_node_rewards_claimed_total[5m])
```

### Security

```promql
# Threat flag rate by type and level
rate(tamizhi_threat_flags_raised_total[5m])

# Ratio of resolved to raised flags (resolution health)
increase(tamizhi_threat_flags_resolved_total[1h])
  / increase(tamizhi_threat_flags_raised_total[1h])

# Blocked transaction rate
rate(tamizhi_ante_blocked_txs_total[5m])

# Rate limit rejection rate
rate(tamizhi_ante_rate_limited_total[5m])

# Insufficient-fee rejection rate
rate(tamizhi_ante_insufficient_fee_total[5m])
```

### Access Logs

```promql
# Access log write rate by action
rate(tamizhi_access_logs_written_total[5m])

# Total access log entries
tamizhi_access_logs_written_total
```

---

## Sample Grafana Panel JSON — Rewards Dashboard

The panel below renders a time-series graph of reward issuance broken down by
`rule_id`. Import it into a Grafana dashboard via **Dashboard → Add panel → Import JSON**.

```json
{
  "title": "Tamizhi Rewards Issued (by rule)",
  "type": "timeseries",
  "datasource": {
    "type": "prometheus",
    "uid": "${datasource}"
  },
  "fieldConfig": {
    "defaults": {
      "unit": "short",
      "color": { "mode": "palette-classic" },
      "custom": {
        "lineWidth": 2,
        "fillOpacity": 10,
        "showPoints": "never"
      }
    }
  },
  "options": {
    "legend": { "displayMode": "table", "placement": "bottom", "calcs": ["lastNotNull", "sum"] },
    "tooltip": { "mode": "multi" }
  },
  "targets": [
    {
      "expr": "rate(tamizhi_rewards_issued_total[5m])",
      "legendFormat": "rule={{rule_id}}",
      "refId": "A"
    }
  ],
  "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 }
}
```

Additional recommended panels for a full rewards dashboard:

```json
[
  {
    "title": "Daily Limit Hit Rate",
    "type": "timeseries",
    "targets": [
      {
        "expr": "rate(tamizhi_daily_limit_hit_total[5m])",
        "legendFormat": "rule={{rule_id}}",
        "refId": "A"
      }
    ],
    "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 }
  },
  {
    "title": "Reward Rules Created (cumulative)",
    "type": "stat",
    "targets": [
      {
        "expr": "tamizhi_rules_created_total",
        "legendFormat": "Rules",
        "refId": "A"
      }
    ],
    "options": { "reduceOptions": { "calcs": ["lastNotNull"] } },
    "gridPos": { "x": 0, "y": 8, "w": 6, "h": 4 }
  }
]
```
