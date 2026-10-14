/**
 * explorer-api.ts
 * Typed REST client for the Tamizhi blockchain.
 *
 * Dual-client:
 *   apiClient  → custom explorer backend at NEXT_PUBLIC_EXPLORER_API (default: http://localhost:3001/api/v1)
 *   restClient → Cosmos SDK REST at NEXT_PUBLIC_REST_URL (default: https://api.tamizhi.ai)
 *
 * All functions throw ExplorerOfflineError when the backend is unreachable.
 */

import axios, { AxiosError } from 'axios';

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_EXPLORER_API) ||
  'http://localhost:3001/api/v1';

const REST_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_REST_URL) ||
  'https://api.tamizhi.ai';

const apiClient = axios.create({ baseURL: API_BASE, timeout: 10_000 });
const restClient = axios.create({ baseURL: REST_BASE, timeout: 10_000 });

// ─── Error types ──────────────────────────────────────────────────────────────

export class ExplorerOfflineError extends Error {
  constructor(message = 'Chain is offline or unreachable') {
    super(message);
    this.name = 'ExplorerOfflineError';
  }
}

function wrapError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError;
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
      (axErr.response?.data as Record<string, unknown>)?.message as string ||
        axErr.message ||
        'Request failed'
    );
  }
  throw err;
}

// ─── New API types ────────────────────────────────────────────────────────────

export interface ChainStats {
  total_blocks: number;
  total_transactions: number;
  total_nodes: number;
  total_literature_works: number;
  latest_block: { height: number; hash: string; time: string } | null;
}

export interface Block {
  height: number;
  hash: string;
  time: string;
  proposer: string;
  tx_count: number;
}

export interface BlockDetail extends Block {
  transactions: Tx[];
}

export interface Tx {
  hash: string;
  height?: number;
  index?: number;
  sender: string;
  msg_types: string[];
  code: number;
  gas_used: number;
  gas_wanted: number;
  fee_amount: string;
  fee_denom: string;
  memo: string;
  time?: string;
}

export interface TxDetail extends Tx {
  raw_log: string;
}

export interface Validator {
  operator_address: string;
  description: { moniker: string; identity?: string; website?: string; details?: string };
  commission: { commission_rates: { rate: string; max_rate?: string } };
  status: string;
  tokens: string;
  jailed?: boolean;
  delegator_shares?: string;
}

export interface LiteratureWork {
  id: string;
  title: string;
  author: string;
  period?: string;
  genre?: string;
  hash?: string;
  verified?: boolean;
  submitter?: string;
  created_at?: string;
}

export interface AddressInfo {
  address: string;
  balance: string;
  tx_count?: number;
}

export interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

// ─── New /api/v1 functions ────────────────────────────────────────────────────

export async function getStats(): Promise<ChainStats> {
  try {
    const { data } = await apiClient.get<ChainStats>('/stats');
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

export async function getBlocks(
  limit = 20,
  offset = 0
): Promise<{ blocks: Block[]; pagination: Pagination }> {
  try {
    const { data } = await apiClient.get('/blocks', { params: { limit, offset } });
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

export async function getBlockByHeight(height: number): Promise<BlockDetail> {
  try {
    const { data } = await apiClient.get<{ block: BlockDetail; transactions: Tx[] }>(
      `/blocks/${height}`
    );
    return { ...data.block, transactions: data.transactions ?? [] };
  } catch (err) {
    return wrapError(err);
  }
}

export async function getTransactionsList(
  limit = 20,
  offset = 0
): Promise<{ txs: Tx[]; pagination: Pagination }> {
  try {
    const { data } = await apiClient.get('/txs', { params: { limit, offset } });
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

export async function getTransactionByHash(hash: string): Promise<TxDetail> {
  try {
    const { data } = await apiClient.get<TxDetail>(`/txs/${hash}`);
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

export async function getLiteratureWorks(limit = 20): Promise<LiteratureWork[]> {
  try {
    const { data } = await apiClient.get('/literature', { params: { limit } });
    return Array.isArray(data) ? data : data.works ?? [];
  } catch (err) {
    return wrapError(err);
  }
}

export async function getLiteratureWork(id: string): Promise<LiteratureWork> {
  try {
    const { data } = await apiClient.get<LiteratureWork>(`/literature/${id}`);
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

export async function getAddress(address: string): Promise<AddressInfo> {
  try {
    const { data } = await apiClient.get<AddressInfo>(`/address/${address}`);
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

// ─── Cosmos REST validator fetch ───────────────────────────────────────────────

export async function getValidators(): Promise<Validator[]> {
  try {
    const { data } = await restClient.get('/cosmos/staking/v1beta1/validators', {
      params: { 'pagination.limit': 200 },
    });
    return data.validators ?? [];
  } catch (err) {
    // Fallback: try the local API backend
    try {
      const { data } = await apiClient.get('/validators');
      return Array.isArray(data) ? data : data.validators ?? [];
    } catch (innerErr) {
      return wrapError(innerErr);
    }
  }
}

// ─── Legacy Cosmos REST types (kept for backwards compat) ─────────────────────

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

export interface CosmosBlock {
  block_id: { hash: string };
  block: {
    header: BlockHeader;
    data: { txs: string[] };
  };
}

export interface TxMessage {
  '@type': string;
  [key: string]: unknown;
}

export interface CosmosTx {
  hash: string;
  height: string;
  tx: {
    body: { messages: TxMessage[]; memo: string };
    auth_info: { fee: { amount: Array<{ denom: string; amount: string }>; gas_limit: string } };
  };
  tx_result: {
    code: number;
    log: string;
    gas_wanted: string;
    gas_used: string;
    events: Array<{ type: string; attributes: Array<{ key: string; value: string }> }>;
  };
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
  instantiate_permission: { permission: string; address: string; addresses: string[] };
}

export interface ContractInfo {
  address: string;
  contract_info: {
    code_id: string;
    creator: string;
    admin: string;
    label: string;
    created: { block_height: string; tx_index: string };
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

// ─── Legacy Cosmos REST functions ─────────────────────────────────────────────

export async function getLatestBlock(): Promise<CosmosBlock> {
  try {
    const { data } = await restClient.get('/cosmos/base/tendermint/v1beta1/blocks/latest');
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

export async function getBlock(height: number): Promise<CosmosBlock> {
  try {
    const { data } = await restClient.get(`/cosmos/base/tendermint/v1beta1/blocks/${height}`);
    return data;
  } catch (err) {
    return wrapError(err);
  }
}

export async function getRecentBlocks(latestHeight: number, count = 20): Promise<CosmosBlock[]> {
  const heights = Array.from(
    { length: Math.min(count, latestHeight) },
    (_, i) => latestHeight - i
  ).filter((h) => h > 0);

  const results = await Promise.allSettled(heights.map((h) => getBlock(h)));
  return results
    .filter((r): r is PromiseFulfilledResult<CosmosBlock> => r.status === 'fulfilled')
    .map((r) => r.value);
}

export async function getBlockTransactions(height: number): Promise<CosmosTx[]> {
  try {
    const { data } = await restClient.get('/cosmos/tx/v1beta1/txs', {
      params: { events: `tx.height=${height}`, limit: 100 },
    });
    const responses: Record<string, unknown>[] = data.tx_responses ?? [];
    const txs: Record<string, unknown>[] = data.txs ?? [];
    return responses.map((resp, idx) => ({
      hash: resp.txhash as string,
      height: resp.height as string,
      tx: (txs[idx] ?? {}) as CosmosTx['tx'],
      tx_result: {
        code: (resp.code as number) ?? 0,
        log: (resp.raw_log as string) ?? '',
        gas_wanted: (resp.gas_wanted as string) ?? '0',
        gas_used: (resp.gas_used as string) ?? '0',
        events: (resp.events as CosmosTx['tx_result']['events']) ?? [],
      },
    }));
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    return wrapError(err);
  }
}

export async function getTransaction(hash: string): Promise<CosmosTx> {
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

export async function getLatestTransactions(limit = 20): Promise<CosmosTx[]> {
  try {
    const { data } = await restClient.get('/cosmos/tx/v1beta1/txs', {
      params: { order_by: 'ORDER_BY_DESC', limit },
    });
    const responses: Record<string, unknown>[] = data.tx_responses ?? [];
    const txs: Record<string, unknown>[] = data.txs ?? [];
    return responses.map((resp, idx) => ({
      hash: resp.txhash as string,
      height: resp.height as string,
      tx: (txs[idx] ?? {}) as CosmosTx['tx'],
      tx_result: {
        code: (resp.code as number) ?? 0,
        log: (resp.raw_log as string) ?? '',
        gas_wanted: (resp.gas_wanted as string) ?? '0',
        gas_used: (resp.gas_used as string) ?? '0',
        events: (resp.events as CosmosTx['tx_result']['events']) ?? [],
      },
    }));
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
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
    const supplies: Array<{ denom: string; amount: string }> = supplyRes.data.supply ?? [];
    const tmzSupply = supplies.find((s) => s.denom === 'utmz')?.amount ?? '0';
    return {
      latestHeight: header.height ?? '0',
      latestTime: header.time ?? new Date().toISOString(),
      chainId: header.chain_id ?? 'tamizhi-1',
      bondedTokens: pool.bonded_tokens ?? '0',
      notBondedTokens: pool.not_bonded_tokens ?? '0',
      totalSupply: tmzSupply,
      validatorCount: 0,
    };
  } catch (err) {
    return wrapError(err);
  }
}

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
    const { data } = await restClient.get(`/cosmwasm/wasm/v1/code/${codeId}/contracts`, {
      params: { 'pagination.limit': 100 },
    });
    return data.contracts ?? [];
  } catch (err) {
    return wrapError(err);
  }
}

export async function getContractInfo(address: string): Promise<ContractInfo> {
  try {
    const { data } = await restClient.get(`/cosmwasm/wasm/v1/contract/${address}`);
    return { address, contract_info: data.contract_info };
  } catch (err) {
    return wrapError(err);
  }
}

export async function queryContract(address: string, query: object): Promise<unknown> {
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

export async function getAllContracts(): Promise<ContractInfo[]> {
  try {
    const { data } = await restClient.get('/cosmwasm/wasm/v1/contract', {
      params: { 'pagination.limit': 100 },
    });
    if (data.contracts) return data.contracts as ContractInfo[];
    return [];
  } catch (err) {
    try {
      const codes = await getWasmCodes();
      const contractLists = await Promise.all(codes.map((c) => getContracts(Number(c.code_id))));
      const addresses = contractLists.flat();
      return Promise.all(addresses.map((a) => getContractInfo(a)));
    } catch (innerErr) {
      return wrapError(innerErr);
    }
  }
}

// ─── Shared helpers (exported for page use) ───────────────────────────────────

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function truncateHash(hash: string, chars = 8): string {
  return hash ? `${hash.slice(0, chars)}...${hash.slice(-chars)}` : '—';
}

export function formatTMZ(utmz: string | number): string {
  return (Number(utmz) / 1_000_000).toFixed(2) + ' TMZ';
}
