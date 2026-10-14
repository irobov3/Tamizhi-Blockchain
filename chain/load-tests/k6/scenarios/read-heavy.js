/**
 * read-heavy.js
 *
 * Pure read load test — hammers all Tamizhi query endpoints at a constant
 * arrival rate of 100 requests/second.
 *
 * Endpoints exercised (round-robin per VU):
 *   1. /tamizhi/rewards/v1/rules
 *   2. /tamizhi/nodes/v1/nodes
 *   3. /tamizhi/literature/v1/works
 *   4. /tamizhi/accesslog/v1/logs
 *   5. /tamizhi/security/v1/threats
 *   6. /cosmos/base/tendermint/v1beta1/blocks/latest
 *
 * Thresholds:
 *   p95 < 200 ms   (fast read path)
 *   p99 < 500 ms   (tail latency acceptable)
 *   error_rate < 1 %
 */

import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const errorRate = new Rate('error_rate');

// ---------------------------------------------------------------------------
// Scenario configuration
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    read_heavy: {
      executor: 'constant-arrival-rate',
      // Target throughput: 100 requests/second
      rate: 100,
      timeUnit: '1s',
      duration: '60s',
      // Pre-allocated VUs (k6 will warn if more are needed)
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    // REST response time
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    // Less than 1 % of requests may return a non-2xx/404 status
    error_rate: ['rate<0.01'],
  },
  summaryTrendStats: ['min', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// ---------------------------------------------------------------------------
// Endpoint table – rotated via VU index
// ---------------------------------------------------------------------------
const ENDPOINTS = [
  { path: '/tamizhi/rewards/v1/rules',                        name: 'QueryRewardRules'     },
  { path: '/tamizhi/nodes/v1/nodes',                          name: 'QueryNodes'            },
  { path: '/tamizhi/literature/v1/works',                     name: 'QueryLiteraryWorks'   },
  { path: '/tamizhi/accesslog/v1/logs',                       name: 'QueryAccessLogs'      },
  { path: '/tamizhi/security/v1/threats',                     name: 'QuerySecurityThreats' },
  { path: '/cosmos/base/tendermint/v1beta1/blocks/latest',    name: 'QueryLatestBlock'     },
];

// ---------------------------------------------------------------------------
// Default function
// ---------------------------------------------------------------------------
export default function () {
  const restUrl = __ENV.REST_URL || 'http://localhost:1317';

  // Distribute endpoint selection across VUs so every endpoint is covered
  const endpoint = ENDPOINTS[__VU % ENDPOINTS.length];

  const res = http.get(`${restUrl}${endpoint.path}`, {
    tags: { name: endpoint.name },
  });

  // 200 OK and 404 Not Found are both acceptable (module may have no data yet)
  const ok = res.status === 200 || res.status === 404;

  check(res, {
    [`${endpoint.name}: 2xx or 404`]: () => ok,
    [`${endpoint.name}: p95 < 200 ms`]: (r) => r.timings.duration < 200,
  });

  // Record error for any unexpected status
  errorRate.add(!ok);

  if (!ok) {
    console.warn(`[${endpoint.name}] Unexpected status ${res.status}: ${res.body?.slice(0, 200)}`);
  }
}
