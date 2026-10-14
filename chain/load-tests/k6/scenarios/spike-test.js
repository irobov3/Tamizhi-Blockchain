/**
 * spike-test.js
 *
 * Sudden traffic spike scenario — verifies the Tamizhi chain remains
 * responsive and keeps producing blocks under a sharp load increase.
 *
 * Profile:
 *   0 → 200 VUs  in 10 s  (spike onset)
 *   200 VUs      for 30 s  (sustained peak)
 *   200 → 0 VUs  in 10 s  (ramp-down)
 *
 * Each VU:
 *   1. Queries the latest block to confirm the chain is still producing blocks.
 *   2. Attempts a broadcast to exercise the write path under load.
 *   3. Records block height drift to detect stalls.
 *
 * Thresholds:
 *   http_req_duration p95 < 3 s   (generous — spike conditions expected)
 *   http_req_failed   rate < 0.05  (less than 5 % HTTP-level failures)
 *   block_stall_rate  rate < 0.02  (chain must keep producing blocks)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Gauge } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const blockHeightGauge = new Gauge('chain_block_height');
const blockStallRate   = new Rate('block_stall_rate');
const broadcastLatency = new Trend('spike_broadcast_latency_ms', true);

// ---------------------------------------------------------------------------
// Scenario configuration
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 }, // sudden spike
        { duration: '30s', target: 200 }, // hold at peak
        { duration: '10s', target: 0   }, // ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // REST response times under spike — allow up to 3 s at p95
    http_req_duration: ['p(95)<3000'],
    // HTTP-level transport failures should stay under 5 %
    http_req_failed: ['rate<0.05'],
    // Block production stalls should be very rare
    block_stall_rate: ['rate<0.02'],
  },
  summaryTrendStats: ['min', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// ---------------------------------------------------------------------------
// Module-level state shared across iterations within a VU
// ---------------------------------------------------------------------------
let lastSeenHeight = 0;

// ---------------------------------------------------------------------------
// Default function
// ---------------------------------------------------------------------------
export default function () {
  const restUrl = __ENV.REST_URL || 'http://localhost:1317';

  // ── Step 1: Latest block health check ────────────────────────────────────
  const blockRes = http.get(
    `${restUrl}/cosmos/base/tendermint/v1beta1/blocks/latest`,
    { tags: { name: 'SpikeBlockCheck' } }
  );

  let stalled = true;
  if (blockRes.status === 200) {
    const data = JSON.parse(blockRes.body);
    const height = parseInt(data.block?.header?.height || '0');
    blockHeightGauge.add(height);

    if (height > 0) {
      // A stall is when the chain reports the same (or lower) block height
      // across consecutive VU iterations — sign of a stuck consensus round.
      stalled = height <= lastSeenHeight && lastSeenHeight !== 0;
      lastSeenHeight = height;
    }
  }

  blockStallRate.add(stalled);

  check(blockRes, {
    'block check: 200 OK': (r) => r.status === 200,
    'block check: height > 0': () => !stalled,
  });

  // ── Step 2: Write pressure – broadcast attempt ────────────────────────────
  const start = Date.now();
  const writeRes = http.post(
    `${restUrl}/cosmos/tx/v1beta1/txs`,
    JSON.stringify({
      // Placeholder bytes — ante-handler rejection (400) is expected and fine.
      // Replace with real pre-signed tx bytes for genuine throughput measurement.
      tx_bytes: 'AAAA',
      mode: 'BROADCAST_MODE_SYNC',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'SpikeBroadcast' },
    }
  );
  broadcastLatency.add(Date.now() - start);

  check(writeRes, {
    'broadcast: no 5xx during spike': (r) => r.status < 500,
  });

  // ── Step 3: Mempool size check (via RPC) ──────────────────────────────────
  const rpcUrl = __ENV.RPC_URL || 'http://localhost:26657';
  const mempoolRes = http.get(`${rpcUrl}/num_unconfirmed_txs`, {
    tags: { name: 'SpikeMempoolCheck' },
  });

  if (mempoolRes.status === 200) {
    const mdata = JSON.parse(mempoolRes.body);
    const nTxs = parseInt(mdata.result?.n_txs || '0');
    check(mempoolRes, {
      // Under extreme spike the mempool may fill; > 5000 queued txs signals saturation
      'mempool: not saturated (< 5000 pending)': () => nTxs < 5000,
    });
  }

  // Short sleep so each VU doesn't fully peg a single CPU core
  sleep(0.05);
}
