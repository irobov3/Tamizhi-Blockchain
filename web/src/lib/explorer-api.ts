/**
 * explorer-api.ts
 * Typed REST client for the Tamizhi blockchain (Cosmos SDK + CosmWasm).
 * All functions handle "chain offline" gracefully by throwing ExplorerOfflineError.
 */

import axios, { AxiosError } from 'axios';

const REST =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_REST_URL) ||
  'http://localhost:1317';

const restClient = axios.create({
  baseURL: REST,
  timeout: 10_000,
});

// ─── Error types ─────────────────────────────────────────────────────────────

export class ExplorerOfflineError extends Error {
  constructor(message = 'Chain is offline or unreachable') {
    super(message);
    this.name = 'ExplorerOfflineError';
  }
}

function wrapError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError;
    // ECONNREFUSED / ECONNRESET / network errors mean chain is down
    if (
      axErr.code === 'ECONNREFUSED' ||
      axErr.code === 'ECONNRESET' ||
      axErr.code === 'ETIMEDOUT' ||
      axErr.code === 'ERR_NETWORK' ||
      !axErr.response
    ) {
      throw new ExplorerOfflineError();
    }
    throw new Error(
      (axErr.response?.data as any)?.message ||
        axErr.message ||
        'Request failed'
    );
  }
  throw err;
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface BlockHeader {
  version: { block: string };
  chain_id: string;
  height: string;
  time: string;
  proposer_address: string;
  last_block_id: { hash: string };
  app_hash: string;
  data_hash: string;
}

export interface Block {
  block_id: { hash: string };
  block: {
    header: BlockHeader;
    data: {
      txs: string[]; // base64-encoded raw txs
    };
  };
}

export interface TxLog {
  msg_index: number;
  log: string;
  events: Array<{ type: string; attributes: Array<{ key: string; value: string }> }>;
}

export interface TxMessage {
  '@type': string;
  [key: string]: unknown;
}

export interface Tx {
  hash: string;
  height: string;
  tx: {
    body: {
      messages: TxMessage[];
      memo: string;
    };
    auth_info: {
      fee: {
        amount: Array<{ denom: string; amount: string }>;
        gas_limit: string;
      };
    };
  };
  tx_result: {
    code: number;
    log: string;
    gas_wanted: string;
    gas_used: string;
    events: Array<{ type: string; attributes: Array<{ key: string; value: string }> }>;
  };
}

export interface Validator {
  operator_address: string;
  consensus_pubkey: { '@type': string; key: string };
  jailed: boolean;
  status: string;
  tokens: string;
  delegator_shares: string;
  description: {
    moniker: string;
    identity: string;
    website: string;
    security_contact: string;
    details: string;
  };
  commission: {
    commission_rates: {
      rate: string;
      max_rate: string;
      max_change_rate: string;
    };
    update_time: string;
  };
  min_self_delegation: string;
}

export interface ChainStatus {
  latestHeight: string;
  latestTime: string;
  chainId: string;
  bondedTokens: string;
  notBondedTokens: string;
  totalSupply: string;
  validatorCount: number;
}

export interface WasmCode {
  code_id: string;
  creator: string;
  data_hash: string;
  instantiate_permission: {
    permission: string;
    address: string;
    addresses: string[];
  };
}

export interface ContractInfo {
  address: string;
  contract_info: {
    code_id: string;
    creator: string;
    admin: string;
    label: string;
    created: {
      block_height: string;
      tx_index: string;
    };
    ibc_port_id: string;
    extension: null | Record<string, unknown>;
  };
}

export interface LiteraryWork {
  id: string;
  title: string;
  title_tamil?: string;
  author: string;
  period: string;
  genre?: string;
  ipfs_cid?: string;
  description?: string;
  is_verified?: boolean;
  token_id?: string;
}

// ─── Chain queries ────────────────────────────────────────────────────────────

export async function getLatestBlock(): Promise<Block> {
  try {
    const { data } = await restClient.get('/cosmos/base/tendermint/v1beta1/blocks/latest');
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

export async function getBlock(height: number): Promise<Block> {
  try {
    const { data } = await restClient.get(
      `/cosmos/base/tendermint/v1beta1/blocks/${height}`
    );
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

/**
 * Fetch transactions by block height using the tx-search endpoint.
 * Falls back to empty array on "not found" responses (404).
 */
export async function getTransactions(
  height?: number,
  limit = 10
): Promise<Tx[]> {
  try {
    const params: Record<string, string | number> = {
      limit,
      order_by: 'ORDER_BY_DESC',
    };
    if (height !== undefined) {
      params['events'] = `tx.height=${height}`;
    }
    const { data } = await restClient.get('/cosmos/tx/v1beta1/txs', { params });
    return (data.txs ?? []).map((tx: any, idx: number) => ({
      ...tx,
      hash: data.tx_responses?.[idx]?.txhash ?? '',
      height: data.tx_responses?.[idx]?.height ?? '',
      tx_result: {
        code: data.tx_responses?.[idx]?.code ?? 0,
        log: data.tx_responses?.[idx]?.raw_log ?? '',
        gas_wanted: data.tx_responses?.[idx]?.gas_wanted ?? '0',
        gas_used: data.tx_responses?.[idx]?.gas_used ?? '0',
        events: data.tx_responses?.[idx]?.events ?? [],
      },
    }));
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    return wrapError(err);
  }
}

/**
 * Fetch transactions for a specific block height, returning tx_responses directly.
 */
export async function getBlockTransactions(height: number): Promise<Tx[]> {
  try {
    const { data } = await restClient.get('/cosmos/tx/v1beta1/txs', {
      params: {
        events: `tx.height=${height}`,
        limit: 100,
      },
    });
    const responses: any[] = data.tx_responses ?? [];
    const txs: any[] = data.txs ?? [];
    return responses.map((resp, idx) => ({
      hash: resp.txhash,
      height: resp.height,
      tx: txs[idx] ?? {},
      tx_result: {
        code: resp.code ?? 0,
        log: resp.raw_log ?? '',
        gas_wanted: resp.gas_wanted ?? '0',
        gas_used: resp.gas_used ?? '0',
        events: resp.events ?? [],
      },
    }));
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    return wrapError(err);
  }
}

export async function getTransaction(hash: string): Promise<Tx> {
  try {
    const { data } = await restClient.get(`/cosmos/tx/v1beta1/txs/${hash}`);
    const resp = data.tx_response;
    return {
      hash: resp.txhash,
      height: resp.height,
      tx: data.tx,
      tx_result: {
        code: resp.code ?? 0,
        log: resp.raw_log ?? '',
        gas_wanted: resp.gas_wanted ?? '0',
        gas_used: resp.gas_used ?? '0',
        events: resp.events ?? [],
      },
    };
  } catch (err) {
    return wrapError(err);
  }
}

export async function getLatestTransactions(limit = 20): Promise<Tx[]> {
  try {
    const { data } = await restClient.get('/cosmos/tx/v1beta1/txs', {
      params: {
        order_by: 'ORDER_BY_DESC',
        limit,
      },
    });
    const responses: any[] = data.tx_responses ?? [];
    const txs: any[] = data.txs ?? [];
    return responses.map((resp, idx) => ({
      hash: resp.txhash,
      height: resp.height,
      tx: txs[idx] ?? {},
      tx_result: {
        code: resp.code ?? 0,
        log: resp.raw_log ?? '',
        gas_wanted: resp.gas_wanted ?? '0',
        gas_used: resp.gas_used ?? '0',
        events: resp.events ?? [],
      },
    }));
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    return wrapError(err);
  }
}

export async function getValidators(): Promise<Validator[]> {
  try {
    const { data } = await restClient.get(
      '/cosmos/staking/v1beta1/validators',
      { params: { status: 'BOND_STATUS_BONDED', 'pagination.limit': 200 } }
    );
    return data.validators ?? [];
  } catch (err) {
    return wrapError(err);
  }
}

export async function getChainStatus(): Promise<ChainStatus> {
  try {
    const [blockRes, stakingRes, supplyRes] = await Promise.all([
      restClient.get('/cosmos/base/tendermint/v1beta1/blocks/latest'),
      restClient.get('/cosmos/staking/v1beta1/pool'),
      restClient.get('/cosmos/bank/v1beta1/supply'),
    ]);

    const header = blockRes.data.block?.header ?? {};
    const pool = stakingRes.data.pool ?? {};

    // Find TMZ total supply
    const supplies: Array<{ denom: string; amount: string }> =
      supplyRes.data.supply ?? [];
    const tmzSupply =
      supplies.find((s) => s.denom === 'utmz')?.amount ?? '0';

    return {
      latestHeight: header.height ?? '0',
      latestTime: header.time ?? new Date().toISOString(),
      chainId: header.chain_id ?? 'tamizhi-1',
      bondedTokens: pool.bonded_tokens ?? '0',
      notBondedTokens: pool.not_bonded_tokens ?? '0',
      totalSupply: tmzSupply,
      validatorCount: 0, // filled in by callers if needed
    };
  } catch (err) {
    return wrapError(err);
  }
}

// ─── CosmWasm ─────────────────────────────────────────────────────────────────

export async function getWasmCodes(): Promise<WasmCode[]> {
  try {
    const { data } = await restClient.get('/cosmwasm/wasm/v1/code', {
      params: { 'pagination.limit': 100 },
    });
    return data.code_infos ?? [];
  } catch (err) {
    return wrapError(err);
  }
}

export async function getContracts(codeId: number): Promise<string[]> {
  try {
    const { data } = await restClient.get(
      `/cosmwasm/wasm/v1/code/${codeId}/contracts`,
      { params: { 'pagination.limit': 100 } }
    );
    return data.contracts ?? [];
  } catch (err) {
    return wrapError(err);
  }
}

export async function getContractInfo(address: string): Promise<ContractInfo> {
  try {
    const { data } = await restClient.get(
      `/cosmwasm/wasm/v1/contract/${address}`
    );
    return { address, contract_info: data.contract_info };
  } catch (err) {
    return wrapError(err);
  }
}

export async function queryContract(
  address: string,
  query: object
): Promise<unknown> {
  try {
    const encoded = Buffer.from(JSON.stringify(query)).toString('base64');
    const { data } = await restClient.get(
      `/cosmwasm/wasm/v1/contract/${address}/smart/${encoded}`
    );
    return data.data;
  } catch (err) {
    return wrapError(err);
  }
}

/**
 * Get all contracts across all code IDs (used for the contracts list page).
 */
export async function getAllContracts(): Promise<ContractInfo[]> {
  try {
    const { data } = await restClient.get('/cosmwasm/wasm/v1/contract', {
      params: { 'pagination.limit': 100 },
    });
    // Some node versions expose this endpoint directly
    if (data.contracts) {
      return data.contracts as ContractInfo[];
    }
    return [];
  } catch (err) {
    // Fallback: enumerate by code
    try {
      const codes = await getWasmCodes();
      const contractLists = await Promise.all(
        codes.map((c) => getContracts(Number(c.code_id)))
      );
      const addresses = contractLists.flat();
      const infos = await Promise.all(addresses.map((a) => getContractInfo(a)));
      return infos;
    } catch (innerErr) {
      return wrapError(innerErr);
    }
  }
}

// ─── Block pagination helpers ─────────────────────────────────────────────────

/**
 * Fetch a range of blocks starting from `fromHeight` downward, up to `count`.
 * Cosmos REST doesn't have a "latest N blocks" endpoint, so we fetch them in parallel.
 */
export async function getRecentBlocks(
  latestHeight: number,
  count = 20
): Promise<Block[]> {
  const heights = Array.from(
    { length: Math.min(count, latestHeight) },
    (_, i) => latestHeight - i
  ).filter((h) => h > 0);

  const results = await Promise.allSettled(
    heights.map((h) => getBlock(h))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Block> => r.status === 'fulfilled')
    .map((r) => r.value);
}
