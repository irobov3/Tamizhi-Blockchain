/**
 * lib/chain.ts
 * REST (LCD) API helpers for the Tamizhi chain.
 *
 * Primary endpoint: https://api.tamizhi.ai
 * Fallback:         http://localhost:1317
 */

export const REST_URL = 'https://api.tamizhi.ai';
export const FALLBACK_REST_URL = 'http://localhost:1317';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TxRecord {
  hash: string;
  height: string;
  timestamp: string;
  /** 0 = success, non-zero = failed */
  code: number;
  memo: string;
  /** Positive = received, negative = sent (in utmz). null if unparseable. */
  amountUtmz: string | null;
  type: 'send' | 'receive' | 'delegate' | 'claim' | 'other';
}

export interface Validator {
  operatorAddress: string;
  moniker: string;
  commissionRate: string; // e.g. "5.00" (percent)
  votingPower: string;    // human-readable TMZ
  jailed: boolean;
  website: string;
  identity: string;
}

export interface Delegation {
  validatorAddress: string;
  validatorMoniker: string;
  shares: string;
  balanceUtmz: string;
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${url}`);
  }
  return (await res.json()) as T;
}

/** Try primary URL, fall back to local if it fails. */
async function resilientGet<T>(path: string): Promise<T> {
  try {
    return await get<T>(`${REST_URL}${path}`);
  } catch {
    return await get<T>(`${FALLBACK_REST_URL}${path}`);
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Fetch the utmz balance for an address.
 * Returns the raw amount string (e.g. "1000000") or "0" if not found.
 */
export async function fetchBalance(address: string): Promise<string> {
  try {
    const data = await resilientGet<{ balances: { denom: string; amount: string }[] }>(
      `/cosmos/bank/v1beta1/balances/${address}`,
    );
    const coin = (data.balances ?? []).find((b) => b.denom === 'utmz');
    return coin?.amount ?? '0';
  } catch (e) {
    console.warn('[chain] fetchBalance error:', e);
    return '0';
  }
}

/**
 * Fetch the last 20 transactions for an address.
 */
export async function fetchTransactions(address: string): Promise<TxRecord[]> {
  const fetchByEvent = async (event: string): Promise<any[]> => {
    try {
      const path =
        `/cosmos/tx/v1beta1/txs?events=${encodeURIComponent(event)}` +
        '&order_by=ORDER_BY_DESC&pagination.limit=20';
      const data = await resilientGet<{ tx_responses: any[] }>(path);
      return data.tx_responses ?? [];
    } catch {
      return [];
    }
  };

  const [received, sent] = await Promise.all([
    fetchByEvent(`transfer.recipient='${address}'`),
    fetchByEvent(`transfer.sender='${address}'`),
  ]);

  const seen = new Set<string>();
  const records: TxRecord[] = [];

  for (const raw of [...received, ...sent]) {
    if (!raw?.txhash || seen.has(raw.txhash)) continue;
    seen.add(raw.txhash);

    // Determine direction and amount
    let amountUtmz: string | null = null;
    let type: TxRecord['type'] = 'other';

    try {
      const messages = raw.tx?.body?.messages ?? [];
      const firstMsg = messages[0];
      const typeUrl: string = firstMsg?.['@type'] ?? '';

      if (typeUrl.includes('MsgSend')) {
        const isSender = firstMsg.from_address === address;
        type = isSender ? 'send' : 'receive';
        const coins: { denom: string; amount: string }[] = firstMsg.amount ?? [];
        const utmz = coins.find((c) => c.denom === 'utmz');
        amountUtmz = utmz?.amount ?? null;
      } else if (typeUrl.includes('MsgDelegate')) {
        type = 'delegate';
        amountUtmz = firstMsg.amount?.amount ?? null;
      } else if (typeUrl.includes('MsgWithdrawDelegatorReward')) {
        type = 'claim';
      }
    } catch {
      // leave defaults
    }

    records.push({
      hash: raw.txhash,
      height: raw.height ?? '',
      timestamp: raw.timestamp ?? '',
      code: raw.code ?? 0,
      memo: raw.tx?.body?.memo ?? '',
      amountUtmz,
      type,
    });
  }

  // Sort descending by height
  records.sort((a, b) => Number(b.height) - Number(a.height));
  return records.slice(0, 20);
}

/**
 * Fetch active bonded validators.
 */
export async function fetchValidators(): Promise<Validator[]> {
  try {
    const data = await resilientGet<{ validators: any[] }>(
      '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=200',
    );
    return (data.validators ?? []).map((v) => ({
      operatorAddress: v.operator_address ?? '',
      moniker: v.description?.moniker ?? 'Unknown',
      commissionRate: (
        parseFloat(v.commission?.commission_rates?.rate ?? '0') * 100
      ).toFixed(2),
      votingPower: (parseInt(v.tokens ?? '0', 10) / 1_000_000).toFixed(0),
      jailed: v.jailed ?? false,
      website: v.description?.website ?? '',
      identity: v.description?.identity ?? '',
    }));
  } catch (e) {
    console.warn('[chain] fetchValidators error:', e);
    return [];
  }
}

/**
 * Fetch delegations for a delegator address.
 */
export async function fetchDelegations(address: string): Promise<Delegation[]> {
  try {
    const data = await resilientGet<{ delegation_responses: any[] }>(
      `/cosmos/staking/v1beta1/delegations/${address}`,
    );
    return (data.delegation_responses ?? []).map((d) => ({
      validatorAddress: d.delegation?.validator_address ?? '',
      validatorMoniker: '', // populated separately if needed
      shares: d.delegation?.shares ?? '0',
      balanceUtmz: d.balance?.amount ?? '0',
    }));
  } catch (e) {
    console.warn('[chain] fetchDelegations error:', e);
    return [];
  }
}

/**
 * Fetch pending staking rewards total in utmz.
 * Returns "0" on error.
 */
export async function fetchRewards(address: string): Promise<string> {
  try {
    const data = await resilientGet<{ total: { denom: string; amount: string }[] }>(
      `/cosmos/distribution/v1beta1/delegators/${address}/rewards`,
    );
    const utmz = (data.total ?? []).find((c) => c.denom === 'utmz');
    // Rewards amounts include decimal places in the Cosmos API
    const raw = parseFloat(utmz?.amount ?? '0');
    return Math.floor(raw).toString();
  } catch (e) {
    console.warn('[chain] fetchRewards error:', e);
    return '0';
  }
}
