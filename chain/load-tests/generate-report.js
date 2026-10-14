#!/usr/bin/env node
/**
 * generate-report.js
 *
 * Reads the k6 JSON summary files produced by run-all.sh and prints a
 * Markdown performance report to stdout.
 *
 * Usage:
 *   node load-tests/generate-report.js <report-dir>
 *
 * Expected files in <report-dir>:
 *   issue-rewards-summary.json
 *   read-heavy-summary.json
 *   spike-summary.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
const reportDir = process.argv[2];
if (!reportDir) {
  console.error('Usage: node generate-report.js <report-dir>');
  process.exit(1);
}

if (!fs.existsSync(reportDir)) {
  console.error(`Report directory not found: ${reportDir}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load and parse a k6 summary JSON file, or return null if missing. */
function loadSummary(filename) {
  const filepath = path.join(reportDir, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${filepath}: ${e.message}`);
    return null;
  }
}

/** Safely navigate nested metric values. */
function metric(summary, ...keys) {
  let val = summary?.metrics;
  for (const k of keys) {
    if (val == null) return null;
    val = val[k];
  }
  return val;
}

/** Format a millisecond value as "X.XX ms" or "X.XX s". */
function fmtMs(ms) {
  if (ms == null) return 'N/A';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(1)} ms`;
}

/** Format a rate (0–1) as a percentage. */
function fmtPct(rate) {
  if (rate == null) return 'N/A';
  return `${(rate * 100).toFixed(2)} %`;
}

/** Format a raw number. */
function fmtNum(n) {
  if (n == null) return 'N/A';
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2);
}

/**
 * Derive a rough TPS estimate.
 * k6 tracks `http_reqs` (total requests) and `http_req_duration` (trend).
 * We use the `count` sub-key of `http_reqs` divided by test duration.
 * Duration is derived from the `state.testRunDurationMs` field if present,
 * otherwise we fall back to a scenario-specific estimate.
 */
function estimateTPS(summary, fallbackDurationSec) {
  const count = summary?.metrics?.http_reqs?.values?.count;
  const durationMs = summary?.state?.testRunDurationMs || (fallbackDurationSec * 1000);
  if (!count || !durationMs) return null;
  return count / (durationMs / 1000);
}

/**
 * Check whether a threshold passed in the k6 summary.
 * k6 records `thresholds` at the top level with `ok: true/false`.
 */
function thresholdStatus(summary, thresholdKey) {
  const t = summary?.metrics?.[thresholdKey]?.thresholds;
  if (!t) return null;
  // Each key is the threshold expression; value has {ok: bool}
  const entries = Object.values(t);
  if (entries.length === 0) return null;
  return entries.every((e) => e.ok) ? 'PASS' : 'FAIL';
}

/** Return a Markdown badge string for pass/fail. */
function badge(status) {
  if (status === 'PASS') return '`PASS`';
  if (status === 'FAIL') return '**`FAIL`**';
  return '`N/A`';
}

// ---------------------------------------------------------------------------
// Scenario-specific section builders
// ---------------------------------------------------------------------------

function sectionIssueRewards(summary) {
  if (!summary) return '_No data — scenario did not run or file is missing._\n';

  const dur   = metric(summary, 'http_req_duration', 'values');
  const tps   = estimateTPS(summary, 120);
  const total = metric(summary, 'http_reqs', 'values', 'count');
  const fails = metric(summary, 'tx_failed_total', 'values', 'count');
  const rate  = metric(summary, 'tx_success_rate', 'values', 'rate');
  const lat   = metric(summary, 'tx_confirmation_latency_ms', 'values');

  const rows = [
    ['Total requests',          fmtNum(total)],
    ['Estimated TPS',           tps != null ? `${tps.toFixed(2)} req/s` : 'N/A'],
    ['Tx success rate',         fmtPct(rate)],
    ['Tx failures',             fmtNum(fails)],
    ['Broadcast latency p50',   fmtMs(lat?.med)],
    ['Broadcast latency p95',   fmtMs(lat?.['p(95)'])],
    ['Broadcast latency p99',   fmtMs(lat?.['p(99)'])],
    ['HTTP duration p50',       fmtMs(dur?.med)],
    ['HTTP duration p95',       fmtMs(dur?.['p(95)'])],
    ['HTTP duration p99',       fmtMs(dur?.['p(99)'])],
    ['HTTP duration max',       fmtMs(dur?.max)],
  ];

  const thresholds = [
    ['tx_success_rate > 95 %',      badge(thresholdStatus(summary, 'tx_success_rate'))],
    ['tx latency p95 < 8 s',        badge(thresholdStatus(summary, 'tx_confirmation_latency_ms'))],
    ['http_req_duration p99 < 2 s', badge(thresholdStatus(summary, 'http_req_duration'))],
  ];

  return formatSection(rows, thresholds);
}

function sectionReadHeavy(summary) {
  if (!summary) return '_No data — scenario did not run or file is missing._\n';

  const dur    = metric(summary, 'http_req_duration', 'values');
  const errRate = metric(summary, 'error_rate', 'values', 'rate');
  const tps    = estimateTPS(summary, 60);
  const total  = metric(summary, 'http_reqs', 'values', 'count');

  const rows = [
    ['Total requests',    fmtNum(total)],
    ['Target rate',       '100 req/s'],
    ['Achieved TPS',      tps != null ? `${tps.toFixed(2)} req/s` : 'N/A'],
    ['Error rate',        fmtPct(errRate)],
    ['HTTP duration p50', fmtMs(dur?.med)],
    ['HTTP duration p95', fmtMs(dur?.['p(95)'])],
    ['HTTP duration p99', fmtMs(dur?.['p(99)'])],
    ['HTTP duration max', fmtMs(dur?.max)],
  ];

  const thresholds = [
    ['http_req_duration p95 < 200 ms', badge(thresholdStatus(summary, 'http_req_duration'))],
    ['error_rate < 1 %',               badge(thresholdStatus(summary, 'error_rate'))],
  ];

  return formatSection(rows, thresholds);
}

function sectionSpike(summary) {
  if (!summary) return '_No data — scenario did not run or file is missing._\n';

  const dur      = metric(summary, 'http_req_duration', 'values');
  const failRate = metric(summary, 'http_req_failed', 'values', 'rate');
  const stall    = metric(summary, 'block_stall_rate', 'values', 'rate');
  const bcastLat = metric(summary, 'spike_broadcast_latency_ms', 'values');
  const total    = metric(summary, 'http_reqs', 'values', 'count');

  const rows = [
    ['Total requests',         fmtNum(total)],
    ['HTTP failure rate',      fmtPct(failRate)],
    ['Block stall rate',       fmtPct(stall)],
    ['Broadcast latency p50',  fmtMs(bcastLat?.med)],
    ['Broadcast latency p95',  fmtMs(bcastLat?.['p(95)'])],
    ['HTTP duration p50',      fmtMs(dur?.med)],
    ['HTTP duration p95',      fmtMs(dur?.['p(95)'])],
    ['HTTP duration p99',      fmtMs(dur?.['p(99)'])],
    ['HTTP duration max',      fmtMs(dur?.max)],
  ];

  const thresholds = [
    ['http_req_duration p95 < 3 s',  badge(thresholdStatus(summary, 'http_req_duration'))],
    ['http_req_failed rate < 5 %',   badge(thresholdStatus(summary, 'http_req_failed'))],
    ['block_stall_rate < 2 %',       badge(thresholdStatus(summary, 'block_stall_rate'))],
  ];

  return formatSection(rows, thresholds);
}

/** Render a metrics table + thresholds table as Markdown. */
function formatSection(rows, thresholds) {
  let out = '';

  out += '#### Metrics\n\n';
  out += '| Metric | Value |\n|---|---|\n';
  for (const [k, v] of rows) {
    out += `| ${k} | ${v} |\n`;
  }

  out += '\n#### Thresholds\n\n';
  out += '| Threshold | Result |\n|---|---|\n';
  for (const [k, v] of thresholds) {
    out += `| ${k} | ${v} |\n`;
  }

  return out + '\n';
}

// ---------------------------------------------------------------------------
// Overall pass/fail decision
// ---------------------------------------------------------------------------

function overallStatus(summaries) {
  for (const s of summaries) {
    if (!s) continue;
    for (const [, metricData] of Object.entries(s.metrics || {})) {
      for (const [, tData] of Object.entries(metricData?.thresholds || {})) {
        if (!tData.ok) return 'FAIL';
      }
    }
  }
  return 'PASS';
}

// ---------------------------------------------------------------------------
// Recommendations engine
// ---------------------------------------------------------------------------

function buildRecommendations(issue, read, spike) {
  const items = [];

  // --- issue-rewards ---
  if (issue) {
    const rate = metric(issue, 'tx_success_rate', 'values', 'rate');
    if (rate != null && rate < 0.95) {
      items.push(
        '**Broadcast success rate below 95 %** — check ante-handler gas limits and ' +
        'consider increasing `max_gas` in `config.toml`. ' +
        'Verify pre-signed tx bytes are valid for production runs.'
      );
    }
    const p95 = metric(issue, 'tx_confirmation_latency_ms', 'values', 'p(95)');
    if (p95 != null && p95 > 8000) {
      items.push(
        '**Broadcast p95 latency exceeds 8 s** — the mempool may be backing up. ' +
        'Consider raising `mempool.size` and `mempool.max_txs_bytes` in `config.toml`, ' +
        'or tune block time (`consensus.timeout_commit`).'
      );
    }
    const httpP99 = metric(issue, 'http_req_duration', 'values', 'p(99)');
    if (httpP99 != null && httpP99 > 2000) {
      items.push(
        '**REST API p99 > 2 s during write load** — consider placing a reverse proxy ' +
        '(nginx/Caddy) in front of the REST server and enabling HTTP/2.'
      );
    }
  }

  // --- read-heavy ---
  if (read) {
    const errRate = metric(read, 'error_rate', 'values', 'rate');
    if (errRate != null && errRate > 0.01) {
      items.push(
        `**Read error rate ${fmtPct(errRate)} exceeds 1 %** — query endpoints are returning ` +
        'unexpected errors. Confirm all Tamizhi modules are registered and the genesis ' +
        'state is initialised correctly.'
      );
    }
    const p95 = metric(read, 'http_req_duration', 'values', 'p(95)');
    if (p95 != null && p95 > 200) {
      items.push(
        `**Read p95 latency ${fmtMs(p95)} exceeds 200 ms** — consider adding an in-process ` +
        'query cache or enabling CometBFT state sync to reduce disk I/O on read paths.'
      );
    }
  }

  // --- spike ---
  if (spike) {
    const stall = metric(spike, 'block_stall_rate', 'values', 'rate');
    if (stall != null && stall > 0.02) {
      items.push(
        `**Block stall rate ${fmtPct(stall)} detected during spike** — the consensus engine ` +
        'struggled to keep up. Review validator timeout settings (`timeout_propose`, ' +
        '`timeout_prevote`) and ensure adequate CPU/memory resources are available.'
      );
    }
    const httpFail = metric(spike, 'http_req_failed', 'values', 'rate');
    if (httpFail != null && httpFail > 0.05) {
      items.push(
        `**HTTP failure rate ${fmtPct(httpFail)} during spike exceeds 5 %** — the REST ` +
        'server dropped connections under load. Tune `rpc.max_open_connections` and ' +
        '`rpc.max_subscription_clients` in `config.toml`, or scale horizontally.'
      );
    }
  }

  if (items.length === 0) {
    items.push('All thresholds passed. No critical issues detected.');
    items.push(
      'Consider raising load targets (VUs / arrival rate) and re-running once ' +
      'the chain is deployed on representative hardware.'
    );
    items.push(
      'For accurate TPS figures, replace the placeholder `tx_bytes` in the ' +
      'issue-rewards scenario with real pre-signed transactions.'
    );
  }

  return items.map((i) => `- ${i}`).join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const issueSummary = loadSummary('issue-rewards-summary.json');
const readSummary  = loadSummary('read-heavy-summary.json');
const spikeSummary = loadSummary('spike-summary.json');

const runDate   = new Date().toISOString();
const dirName   = path.basename(path.resolve(reportDir));
const overall   = overallStatus([issueSummary, readSummary, spikeSummary]);
const overallBadge = overall === 'PASS' ? '`PASS`' : '**`FAIL`**';

// ---------------------------------------------------------------------------
// Render report
// ---------------------------------------------------------------------------
const report = `# Tamizhi Chain — Load Test Performance Report

| Field | Value |
|---|---|
| Report generated | ${runDate} |
| Run ID | ${dirName} |
| Chain | tamizhi-local-1 |
| Overall result | ${overallBadge} |

---

## Summary

This report aggregates results from three k6 load-test scenarios run against the
Tamizhi chain REST API (\`http://localhost:1317\`) and RPC (\`http://localhost:26657\`).

| Scenario | Description | Duration |
|---|---|---|
| issue-rewards | Concurrent IssueReward broadcast stress-test (low → medium → high VUs) | ~120 s |
| read-heavy | Sustained 100 req/s read throughput across all query endpoints | 60 s |
| spike-test | Sudden 0 → 200 VU spike to verify chain stability | ~50 s |

---

## Scenario Results

### 1. issue-rewards — Write Path Stress Test

${sectionIssueRewards(issueSummary)}

### 2. read-heavy — Query Endpoint Throughput

${sectionReadHeavy(readSummary)}

### 3. spike-test — Sudden Traffic Spike

${sectionSpike(spikeSummary)}

---

## Block Utilization Estimate

Block utilization is derived from the mempool observation during the write-load
scenario. A direct measurement requires access to block events or Prometheus
metrics (\`tendermint_consensus_block_size_bytes\`).

| Indicator | Notes |
|---|---|
| Mempool saturation | Observed indirectly via broadcast latency degradation |
| Recommended tool | Prometheus + Grafana dashboard (see \`monitoring/\`) |
| Next step | Enable \`instrumentation.prometheus = true\` in \`config.toml\` |

---

## Recommendations

${buildRecommendations(issueSummary, readSummary, spikeSummary)}

---

## Notes on Methodology

1. **Signed transactions**: k6 cannot natively sign Cosmos SDK transactions.
   The \`issue-rewards\` and \`spike-test\` scenarios use placeholder \`tx_bytes\`.
   The chain's ante-handler rejects these with HTTP 400, which is counted as a
   success in the simulation (the HTTP round-trip is still measured).
   For production load tests, generate real pre-signed tx bytes offline with
   \`cosmjs\` or a Go test binary, and pass them via an environment variable or
   a data file loaded with \`open()\`.

2. **Thresholds**: Defined per scenario in the k6 \`options.thresholds\` object.
   k6 exits with a non-zero code when any threshold is breached; \`run-all.sh\`
   records the breach but continues to the next scenario.

3. **Environment**: Results are only meaningful when the chain is running on
   hardware representative of production. Localnet results on a developer
   laptop will differ significantly from a validator node.

---

_Generated by \`load-tests/generate-report.js\`_
`;

process.stdout.write(report);
