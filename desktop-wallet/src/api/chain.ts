import axios from "axios";
import type { NetworkConfig } from "../store/network";

// Cosmos SDK REST endpoints. Mirrors the apps/wallet web app conventions.

export type Coin = { denom: string; amount: string };

export type Validator = {
  operator_address: string;
  consensus_pubkey?: { "@type": string; key: string };
  jailed: boolean;
  status: string;
  tokens: string;
  delegator_shares: string;
  description: {
    moniker: string;
    identity?: string;
    website?: string;
    security_contact?: string;
    details?: string;
  };
  unbonding_height?: string;
  unbonding_time?: string;
  commission: {
    commission_rates: { rate: string; max_rate: string; max_change_rate: string };
    update_time: string;
  };
  min_self_delegation?: string;
};

export type Delegation = {
  delegation: { delegator_address: string; validator_address: string; shares: string };
  balance: Coin;
};

export type RewardEntry = { validator_address: string; reward: Coin[] };

export type TxResp = {
  txhash: string;
  height: string;
  timestamp: string;
  code: number;
  raw_log?: string;
  tx?: any;
  logs?: any[];
};

function api(net: NetworkConfig) {
  return axios.create({
    baseURL: net.rest,
    timeout: 15_000,
    headers: { Accept: "application/json" },
  });
}

export async function fetchBalance(net: NetworkConfig, address: string): Promise<Coin[]> {
  const { data } = await api(net).get(`/cosmos/bank/v1beta1/balances/${address}`);
  return data?.balances ?? [];
}

export async function fetchValidators(
  net: NetworkConfig,
  status: "BOND_STATUS_BONDED" | "BOND_STATUS_UNBONDED" | "BOND_STATUS_UNBONDING" = "BOND_STATUS_BONDED"
): Promise<Validator[]> {
  const { data } = await api(net).get(`/cosmos/staking/v1beta1/validators`, {
    params: { status, "pagination.limit": 200 },
  });
  return data?.validators ?? [];
}

export async function fetchDelegations(
  net: NetworkConfig,
  address: string
): Promise<Delegation[]> {
  const { data } = await api(net).get(
    `/cosmos/staking/v1beta1/delegations/${address}`
  );
  return data?.delegation_responses ?? [];
}

export async function fetchRewards(net: NetworkConfig, address: string) {
  const { data } = await api(net).get(
    `/cosmos/distribution/v1beta1/delegators/${address}/rewards`
  );
  return {
    rewards: (data?.rewards ?? []) as RewardEntry[],
    total: (data?.total ?? []) as Coin[],
  };
}

export async function fetchTxs(net: NetworkConfig, address: string, limit = 50) {
  // Try sender events first, then receiver
  const events = [
    `message.sender='${address}'`,
    `transfer.recipient='${address}'`,
  ];
  const all: TxResp[] = [];
  for (const ev of events) {
    try {
      const { data } = await api(net).get(`/cosmos/tx/v1beta1/txs`, {
        params: {
          events: ev,
          order_by: "ORDER_BY_DESC",
          "pagination.limit": limit,
        },
      });
      const txs: TxResp[] = (data?.tx_responses ?? []).map((t: any) => ({
        txhash: t.txhash,
        height: t.height,
        timestamp: t.timestamp,
        code: t.code,
        raw_log: t.raw_log,
        tx: t.tx,
        logs: t.logs,
      }));
      all.push(...txs);
    } catch {
      // ignore
    }
  }
  // dedupe by txhash, sort desc by height
  const seen = new Set<string>();
  return all
    .filter((t) => (seen.has(t.txhash) ? false : (seen.add(t.txhash), true)))
    .sort((a, b) => Number(b.height) - Number(a.height));
}

export async function fetchNodeStatus(net: NetworkConfig) {
  // Cosmos REST: /cosmos/base/tendermint/v1beta1/node_info & syncing
  const c = api(net);
  const [info, syncing, latest] = await Promise.all([
    c.get(`/cosmos/base/tendermint/v1beta1/node_info`).then((r) => r.data),
    c.get(`/cosmos/base/tendermint/v1beta1/syncing`).then((r) => r.data),
    c
      .get(`/cosmos/base/tendermint/v1beta1/blocks/latest`)
      .then((r) => r.data)
      .catch(() => null),
  ]);
  return { info, syncing, latest };
}

// Tamizhi chain custom modules — these endpoints follow the cosmos-sdk
// auto-generated REST convention from `module/keeper/grpc_query.go`.

export type LiteraryWork = {
  id: string;
  author: string;
  title: string;
  content_hash: string;
  language: string;
  created_at: string;
};

export async function fetchWorksByAuthor(
  net: NetworkConfig,
  author: string
): Promise<LiteraryWork[]> {
  try {
    const { data } = await api(net).get(`/tamizhi/literature/v1/works`, {
      params: { author },
    });
    return data?.works ?? [];
  } catch {
    return [];
  }
}

export type RewardRecord = {
  employee_id: string;
  recipient: string;
  amount: Coin;
  reason: string;
  timestamp: string;
};

export async function fetchRewardRecords(
  net: NetworkConfig,
  recipient: string
): Promise<RewardRecord[]> {
  try {
    const { data } = await api(net).get(`/tamizhi/rewards/v1/records`, {
      params: { recipient },
    });
    return data?.records ?? [];
  } catch {
    return [];
  }
}
