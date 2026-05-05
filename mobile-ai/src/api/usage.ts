// Optional: log AI usage to Tamizhi chain via accesslog module.
// Wallet integration is left as a stub here — sign and broadcast in your
// wallet code, then call logUsage(walletAddress, action).

import axios from 'axios';
import { CONFIG } from '../config';

export interface UsageEntry {
  walletAddress: string;
  action: string;            // e.g. "ai_query"
  model: string;
  tokens: number;
  ts: number;
}

// REST broadcast helper (stub — replace with proper signing flow).
export async function logUsage(entry: UsageEntry): Promise<boolean> {
  try {
    const url = `${CONFIG.CHAIN_REST_URL}/tamizhi/accesslog/v1/log`;
    await axios.post(url, {
      employee_id: entry.walletAddress,
      action: entry.action,
      meta: JSON.stringify({ model: entry.model, tokens: entry.tokens }),
      ts: entry.ts,
    });
    return true;
  } catch (err) {
    console.warn('[usage] chain log failed (non-fatal)', err);
    return false;
  }
}
