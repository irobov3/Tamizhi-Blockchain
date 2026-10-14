const REST = process.env.NEXT_PUBLIC_REST_URL ?? 'https://api.tamizhi.ai';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Validator {
  operator_address: string;
  description: { moniker: string };
  commission: { commission_rates: { rate: string } };
  tokens: string;
  status: string;
}

export interface Delegation {
  delegation: { validator_address: string; shares: string };
  balance: { amount: string; denom: string };
}

export interface TxRecord {
  hash: string;
  height: string;
  type: string;
  amount?: string;
  timestamp: string;
  status: 'success' | 'failed';
}

// Legacy types kept for literature/nodes/rewards pages
export interface RewardRecord {
  id: string;
  employee_id: string;
  amount: string;
  denom: string;
  reason: string;
  timestamp: string;
  tx_hash?: string;
}

export interface RewardRule {
  id: string;
  name: string;
  description: string;
  amount: string;
  denom: string;
  condition: string;
  active: boolean;
}

export interface ChainNode {
  node_id: string;
  endpoint: string;
  status: 'active' | 'jailed' | 'inactive';
  uptime_score: number;
  staked_amount: string;
  staked_denom: string;
  moniker?: string;
}

export interface AccessLog {
  id: string;
  employee_id: string;
  action: string;
  resource: string;
  timestamp: string;
  ip_address?: string;
}

export interface LiteratureWork {
  id: string;
  title: string;
  author: string;
  era: string;
  lines: number;
  hash: string;
  registered_at: string;
}

export interface ChainStats {
  block_height: number;
  total_txs: number;
  total_validators: number;
  bonded_tokens: string;
  block_time_avg: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatTMZ(utmz: string | number): string {
  const n = typeof utmz === 'string' ? parseInt(utmz, 10) : utmz;
  if (isNaN(n)) return '0 TMZ';
  return `${(n / 1_000_000).toFixed(6)} TMZ`;
}

export function truncateAddr(addr: string, n = 8): string {
  if (!addr || addr.length <= n * 2 + 3) return addr;
  return `${addr.slice(0, n)}...${addr.slice(-6)}`;
}

// ─── Cosmos REST helpers ───────────────────────────────────────────────────────

async function fetchREST<T>(path: string): Promise<T> {
  const res = await fetch(`${REST}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`REST error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Balance ──────────────────────────────────────────────────────────────────

export async function getBalance(address: string): Promise<string> {
  try {
    const data = await fetchREST<{ balance: { amount: string } }>(
      `/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=utmz`,
    );
    return data?.balance?.amount ?? '0';
  } catch {
    // Try the all-balances endpoint as fallback
    try {
      const data = await fetchREST<{ balances: { denom: string; amount: string }[] }>(
        `/cosmos/bank/v1beta1/balances/${address}`,
      );
      const coin = data?.balances?.find((b) => b.denom === 'utmz');
      return coin?.amount ?? '0';
    } catch {
      return '0';
    }
  }
}

// ─── Validators ───────────────────────────────────────────────────────────────

export async function getValidators(): Promise<Validator[]> {
  try {
    const data = await fetchREST<{ validators: Validator[] }>(
      '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=100',
    );
    return data?.validators ?? [];
  } catch {
    return [];
  }
}

// ─── Delegations ──────────────────────────────────────────────────────────────

export async function getDelegations(address: string): Promise<Delegation[]> {
  try {
    const data = await fetchREST<{ delegation_responses: Delegation[] }>(
      `/cosmos/staking/v1beta1/delegations/${address}`,
    );
    return data?.delegation_responses ?? [];
  } catch {
    return [];
  }
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

export async function getRewards(address: string): Promise<string> {
  try {
    const data = await fetchREST<{ total: { denom: string; amount: string }[] }>(
      `/cosmos/distribution/v1beta1/delegators/${address}/rewards`,
    );
    const utmz = data?.total?.find((c) => c.denom === 'utmz');
    if (!utmz) return '0';
    // amount is a decimal string like "12345.123456"
    return String(Math.floor(parseFloat(utmz.amount)));
  } catch {
    return '0';
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(address: string): Promise<TxRecord[]> {
  try {
    const [sent, received] = await Promise.allSettled([
      fetchREST<{ tx_responses: any[] }>(
        `/cosmos/tx/v1beta1/txs?events=message.sender='${address}'&pagination.limit=20&order_by=ORDER_BY_DESC`,
      ),
      fetchREST<{ tx_responses: any[] }>(
        `/cosmos/tx/v1beta1/txs?events=transfer.recipient='${address}'&pagination.limit=20&order_by=ORDER_BY_DESC`,
      ),
    ]);

    const allTxs: any[] = [];
    if (sent.status === 'fulfilled') allTxs.push(...(sent.value?.tx_responses ?? []));
    if (received.status === 'fulfilled') allTxs.push(...(received.value?.tx_responses ?? []));

    // Deduplicate by hash
    const seen = new Set<string>();
    const unique = allTxs.filter((tx) => {
      if (seen.has(tx.txhash)) return false;
      seen.add(tx.txhash);
      return true;
    });

    // Sort descending by height
    unique.sort((a, b) => parseInt(b.height, 10) - parseInt(a.height, 10));

    return unique.map((tx): TxRecord => {
      const msgType: string = tx.tx?.body?.messages?.[0]?.['@type'] ?? '';
      const shortType = msgType.split('.').pop() ?? msgType;
      let amount: string | undefined;
      try {
        const msg = tx.tx?.body?.messages?.[0];
        if (msg?.amount) {
          const coin = Array.isArray(msg.amount) ? msg.amount[0] : msg.amount;
          amount = coin?.amount;
        }
      } catch {
        // ignore
      }
      return {
        hash: tx.txhash,
        height: tx.height,
        type: shortType,
        amount,
        timestamp: tx.timestamp,
        status: tx.code === 0 || tx.code === undefined ? 'success' : 'failed',
      };
    });
  } catch {
    return [];
  }
}

// ─── Legacy API functions (kept for existing pages) ───────────────────────────

export async function getRewardRecords(employeeId: string): Promise<RewardRecord[]> {
  try {
    const res = await fetch(`${REST}/tamizhi/rewards/v1/records/${employeeId}`);
    const data = await res.json();
    return data?.records ?? data ?? [];
  } catch {
    return [];
  }
}

export async function getRewardRules(): Promise<RewardRule[]> {
  try {
    const res = await fetch(`${REST}/tamizhi/rewards/v1/rules`);
    const data = await res.json();
    return data?.rules ?? data ?? [];
  } catch {
    return [];
  }
}

export async function getActiveNodes(): Promise<ChainNode[]> {
  try {
    const res = await fetch(`${REST}/tamizhi/nodes/v1/nodes`);
    const data = await res.json();
    return data?.nodes ?? data ?? [];
  } catch {
    return [];
  }
}

export async function getAccessLogs(employeeId: string): Promise<AccessLog[]> {
  try {
    const res = await fetch(`${REST}/tamizhi/accesslog/v1/logs/employee/${employeeId}`);
    const data = await res.json();
    return data?.logs ?? data ?? [];
  } catch {
    return [];
  }
}

export async function getLiteratureWorks(): Promise<LiteratureWork[]> {
  try {
    const res = await fetch(`${REST}/tamizhi/literature/v1/works`);
    const data = await res.json();
    return data?.works ?? data ?? [];
  } catch {
    return [];
  }
}

export async function getChainStats(): Promise<ChainStats | null> {
  try {
    const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://explorer.tamizhi.ai';
    const res = await fetch(`${EXPLORER}/api/v1/stats`);
    return res.json();
  } catch {
    return null;
  }
}
