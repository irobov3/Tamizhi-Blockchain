// REST (LCD) wrappers for the Tamizhi chain. Default base: http://localhost:1317

export interface Coin {
  denom: string;
  amount: string;
}

export interface ChainTx {
  hash: string;
  height: string;
  timestamp: string;
  code: number;
  memo?: string;
  raw: any;
}

export interface Validator {
  operator_address: string;
  consensus_pubkey?: any;
  jailed: boolean;
  status: string;
  tokens: string;
  delegator_shares: string;
  description: {
    moniker: string;
    identity?: string;
    website?: string;
    details?: string;
  };
  commission: {
    commission_rates: {
      rate: string;
      max_rate: string;
      max_change_rate: string;
    };
  };
  min_self_delegation?: string;
}

export interface Delegation {
  delegation: {
    delegator_address: string;
    validator_address: string;
    shares: string;
  };
  balance: Coin;
}

export interface Reward {
  validator_address: string;
  reward: Coin[];
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  }
  return (await res.json()) as T;
}

export async function getBalance(restUrl: string, address: string): Promise<Coin[]> {
  const r = await get<{ balances: Coin[] }>(
    `${restUrl}/cosmos/bank/v1beta1/balances/${address}`,
  );
  return r.balances ?? [];
}

/** Fetch transactions where the address is sender or recipient (most recent first). */
export async function getTransactions(
  restUrl: string,
  address: string,
  limit = 50,
): Promise<ChainTx[]> {
  const fetchEvents = async (events: string) => {
    const url =
      `${restUrl}/cosmos/tx/v1beta1/txs?events=${encodeURIComponent(events)}` +
      `&order_by=ORDER_BY_DESC&pagination.limit=${limit}`;
    try {
      const r = await get<{ tx_responses: any[] }>(url);
      return r.tx_responses ?? [];
    } catch (e) {
      console.warn('tx fetch failed:', e);
      return [];
    }
  };

  const [recv, sent] = await Promise.all([
    fetchEvents(`transfer.recipient='${address}'`),
    fetchEvents(`transfer.sender='${address}'`),
  ]);

  const seen = new Set<string>();
  const merged: ChainTx[] = [];
  for (const r of [...recv, ...sent]) {
    if (!r?.txhash || seen.has(r.txhash)) continue;
    seen.add(r.txhash);
    merged.push({
      hash: r.txhash,
      height: r.height,
      timestamp: r.timestamp,
      code: r.code ?? 0,
      memo: r.tx?.body?.memo,
      raw: r,
    });
  }
  merged.sort((a, b) => Number(b.height) - Number(a.height));
  return merged.slice(0, limit);
}

export async function getValidators(restUrl: string): Promise<Validator[]> {
  const r = await get<{ validators: Validator[] }>(
    `${restUrl}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=200`,
  );
  return r.validators ?? [];
}

export async function getDelegations(
  restUrl: string,
  address: string,
): Promise<Delegation[]> {
  const r = await get<{ delegation_responses: Delegation[] }>(
    `${restUrl}/cosmos/staking/v1beta1/delegations/${address}`,
  );
  return r.delegation_responses ?? [];
}

export async function getRewards(
  restUrl: string,
  address: string,
): Promise<{ rewards: Reward[]; total: Coin[] }> {
  const r = await get<{ rewards: Reward[]; total: Coin[] }>(
    `${restUrl}/cosmos/distribution/v1beta1/delegators/${address}/rewards`,
  );
  return { rewards: r.rewards ?? [], total: r.total ?? [] };
}

export async function getNodeInfo(
  restUrl: string,
): Promise<{ chain_id?: string; moniker?: string }> {
  try {
    const r = await get<any>(`${restUrl}/cosmos/base/tendermint/v1beta1/node_info`);
    return {
      chain_id: r.default_node_info?.network,
      moniker: r.default_node_info?.moniker,
    };
  } catch {
    return {};
  }
}
