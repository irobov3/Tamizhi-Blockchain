import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
export const txLatency = new Trend('tx_confirmation_latency_ms', true);
export const txSuccess = new Counter('tx_success_total');
export const txFailed = new Counter('tx_failed_total');
export const txSuccessRate = new Rate('tx_success_rate');
export const blockUtilization = new Trend('block_utilization_pct');

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------
const REST_URL = () => __ENV.REST_URL || 'http://localhost:1317';
const RPC_URL  = () => __ENV.RPC_URL  || 'http://localhost:26657';

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

/**
 * Fetch account info (sequence, account number) for a bech32 address.
 */
export function getAccountInfo(address) {
  const res = http.get(`${REST_URL()}/cosmos/auth/v1beta1/accounts/${address}`);
  check(res, { 'getAccountInfo 200': (r) => r.status === 200 });
  return JSON.parse(res.body);
}

/**
 * Return the integer balance of `denom` for `address`, or 0 if not found.
 */
export function getBalance(address, denom = 'utmz') {
  const res = http.get(`${REST_URL()}/cosmos/bank/v1beta1/balances/${address}`);
  const data = JSON.parse(res.body);
  const coin = data.balances?.find((b) => b.denom === denom);
  return coin ? parseInt(coin.amount) : 0;
}

/**
 * Broadcast a signed transaction (base64-encoded protobuf bytes).
 * Uses BROADCAST_MODE_SYNC so the call returns after basic validation.
 */
export function broadcastTx(txBytes) {
  const payload = JSON.stringify({
    tx_bytes: txBytes,
    mode: 'BROADCAST_MODE_SYNC',
  });
  const res = http.post(
    `${REST_URL()}/cosmos/tx/v1beta1/txs`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return JSON.parse(res.body);
}

/**
 * Poll for tx inclusion by hash.  Returns the tx_response object or null on
 * timeout.  Polls every 1 s up to `timeoutMs` ms.
 */
export function waitForTx(txHash, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = http.get(`${REST_URL()}/cosmos/tx/v1beta1/txs/${txHash}`);
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      return data.tx_response;
    }
    sleep(1);
  }
  return null;
}

/**
 * Return the latest committed block height.
 */
export function getLatestBlockHeight() {
  const res = http.get(
    `${REST_URL()}/cosmos/base/tendermint/v1beta1/blocks/latest`
  );
  const data = JSON.parse(res.body);
  return parseInt(data.block?.header?.height || '0');
}

/**
 * Return the number of transactions currently in the mempool.
 */
export function getMempoolSize() {
  const res = http.get(`${RPC_URL()}/num_unconfirmed_txs`);
  const data = JSON.parse(res.body);
  return parseInt(data.result?.n_txs || '0');
}

/**
 * Convenience: assert that `res` has one of the acceptable HTTP statuses and
 * log the body on failure.
 */
export function assertStatus(res, ...statuses) {
  const ok = statuses.includes(res.status);
  if (!ok) {
    console.warn(`Unexpected status ${res.status} for ${res.url}: ${res.body}`);
  }
  return ok;
}
