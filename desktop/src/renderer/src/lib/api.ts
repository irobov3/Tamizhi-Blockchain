import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { LiteraryWork, AIMessage, Transaction } from '../../../shared/types';

// MARK: - Configuration

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const LCD_BASE = import.meta.env.VITE_LCD_URL ?? 'http://localhost:1317';
const CHAIN_ID = import.meta.env.VITE_CHAIN_ID ?? 'tamizhi-1';

// MARK: - Axios Instances

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

const lcdClient: AxiosInstance = axios.create({
  baseURL: LCD_BASE,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// MARK: - JWT Interceptor

apiClient.interceptors.request.use((config) => {
  // Lazily import to avoid circular dep
  try {
    const { useWalletStore } = require('../store/wallet.store') as typeof import('../store/wallet.store');
    const { address } = useWalletStore.getState();
    if (address) {
      config.headers['X-Wallet-Address'] = address;
    }
  } catch {
    // Store not yet initialized
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const msg =
        (error.response?.data as { error?: string })?.error ??
        error.message ??
        'Request failed';
      throw new Error(msg);
    }
    throw error;
  }
);

// MARK: - Wallet / Chain API

export async function getBalance(address: string): Promise<{ amount: string; denom: string; formatted: string }> {
  const { data } = await lcdClient.get<{
    balances: Array<{ denom: string; amount: string }>;
  }>(`/cosmos/bank/v1beta1/balances/${address}`);

  const tmz = data.balances.find((b) => b.denom === 'utmz');
  const raw = tmz?.amount ?? '0';
  const formatted = (parseInt(raw, 10) / 1_000_000).toFixed(6) + ' TMZ';

  return { amount: raw, denom: 'utmz', formatted };
}

export async function sendTx(params: {
  from: string;
  to: string;
  amount: string;
  memo?: string;
  mnemonic: string;
}): Promise<{ txHash: string }> {
  const { data } = await apiClient.post<{ txHash: string }>('/api/v1/wallet/send', {
    ...params,
    denom: 'utmz',
    chainId: CHAIN_ID,
  });
  return data;
}

export async function estimateGas(params: {
  from: string;
  to: string;
  amount: string;
}): Promise<{ gasWanted: string; gasPrice: string; fee: string }> {
  const { data } = await apiClient.post<{ gasWanted: string; gasPrice: string; fee: string }>(
    '/api/v1/wallet/estimate-gas',
    params
  );
  return data;
}

export async function getTransactions(address: string): Promise<Transaction[]> {
  const { data } = await lcdClient.get<{
    txs: Array<{
      txhash: string;
      height: string;
      timestamp: string;
      code?: number;
      tx: {
        body: {
          memo: string;
          messages: Array<{
            '@type': string;
            amount?: Array<{ amount: string; denom: string }>;
            from_address?: string;
            to_address?: string;
          }>;
        };
      };
    }>;
  }>(`/cosmos/tx/v1beta1/txs?events=transfer.sender%3D%27${address}%27&limit=50`);

  return (data.txs ?? []).map((tx) => {
    const msg = tx.tx.body.messages[0];
    const coin = msg?.amount?.[0];
    return {
      hash: tx.txhash,
      height: parseInt(tx.height, 10),
      timestamp: tx.timestamp,
      type: msg?.['@type']?.split('.').pop() ?? 'Unknown',
      from: msg?.from_address,
      to: msg?.to_address,
      amount: coin ? (parseInt(coin.amount, 10) / 1_000_000).toFixed(6) : undefined,
      denom: coin?.denom,
      memo: tx.tx.body.memo,
      status: (tx.code === 0 || tx.code === undefined ? 'success' : 'failed') as 'success' | 'failed',
    };
  });
}

// MARK: - Explorer

export async function getLatestBlocks(limit = 20): Promise<{
  blocks: Array<{
    height: number;
    hash: string;
    timestamp: string;
    proposer: string;
    txCount: number;
  }>;
}> {
  const { data } = await lcdClient.get<{
    blocks: Array<{
      block_id: { hash: string };
      block: {
        header: { height: string; time: string; proposer_address: string };
        data: { txs: string[] };
      };
    }>;
  }>(`/cosmos/base/tendermint/v1beta1/blocks?pagination.limit=${limit}&pagination.reverse=true`);

  return {
    blocks: (data.blocks ?? []).map((b) => ({
      height: parseInt(b.block.header.height, 10),
      hash: b.block_id.hash,
      timestamp: b.block.header.time,
      proposer: b.block.header.proposer_address,
      txCount: b.block.data.txs?.length ?? 0,
    })),
  };
}

export async function getChainStats(): Promise<{
  latestHeight: number;
  activeValidators: number;
  bondedTokens: string;
  inflationRate: string;
}> {
  const [statusResp, stakingResp, mintResp] = await Promise.allSettled([
    lcdClient.get<{ block: { header: { height: string } } }>(
      '/cosmos/base/tendermint/v1beta1/blocks/latest'
    ),
    lcdClient.get<{ pool: { bonded_tokens: string } }>('/cosmos/staking/v1beta1/pool'),
    lcdClient.get<{ inflation: string }>('/cosmos/mint/v1beta1/inflation'),
  ]);

  return {
    latestHeight:
      statusResp.status === 'fulfilled'
        ? parseInt(statusResp.value.data.block.header.height, 10)
        : 0,
    activeValidators: 0,
    bondedTokens:
      stakingResp.status === 'fulfilled'
        ? (parseInt(stakingResp.value.data.pool.bonded_tokens, 10) / 1e6).toFixed(2) + ' TMZ'
        : '0 TMZ',
    inflationRate:
      mintResp.status === 'fulfilled'
        ? (parseFloat(mintResp.value.data.inflation) * 100).toFixed(2) + '%'
        : '0%',
  };
}

// MARK: - Literature

export async function getLiterature(params?: {
  page?: number;
  limit?: number;
  period?: string;
  genre?: string;
  search?: string;
}): Promise<{ works: LiteraryWork[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.period) query.set('period', params.period);
  if (params?.genre) query.set('genre', params.genre);
  if (params?.search) query.set('q', params.search);

  const { data } = await apiClient.get<{
    works: LiteraryWork[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/v1/literature?${query.toString()}`);

  return data;
}

export async function getLiteratureDetail(id: string): Promise<LiteraryWork> {
  const { data } = await apiClient.get<LiteraryWork>(`/api/v1/literature/${id}`);
  return data;
}

export async function uploadLiterature(form: FormData): Promise<{ id: string; ipfsCid: string }> {
  const { data } = await apiClient.post<{ id: string; ipfsCid: string }>(
    '/api/v1/literature',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

// MARK: - Messaging

export async function sendMessage(params: {
  from: string;
  to: string;
  ciphertext?: string;
  nonce?: string;
  ephemeralPubKey?: string;
  body?: string;
}): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/api/v1/messages', params);
  return data;
}

export async function getApiMessages(conversationId: string): Promise<
  Array<{
    id: string;
    from: string;
    to: string;
    ciphertext?: string;
    nonce?: string;
    ephemeralPubKey?: string;
    body?: string;
    timestamp: number;
    status: string;
  }>
> {
  const { data } = await apiClient.get(`/api/v1/conversations/${conversationId}/messages`);
  return data as typeof data;
}

// MARK: - AI

export async function getAIResponse(params: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  language?: string;
  model?: string;
  temperature?: number;
}): Promise<{ response: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const { data } = await apiClient.post<{
    response: string;
    usage?: { promptTokens: number; completionTokens: number };
  }>('/api/v1/ai/chat', { ...params, stream: false });
  return data;
}

/**
 * Returns an EventSource for SSE-streamed AI responses.
 * Caller is responsible for closing the source.
 */
export function streamAIResponse(params: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  language?: string;
  model?: string;
  temperature?: number;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Event) => void;
}): () => void {
  const { onChunk, onDone, onError, ...body } = params;

  // Use fetch + ReadableStream for POST SSE
  const controller = new AbortController();

  fetch(`${API_BASE}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal: controller.signal,
  })
    .then(async (resp) => {
      if (!resp.ok || !resp.body) {
        onError(new Event('error'));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              onDone();
              return;
            }
            try {
              const parsed = JSON.parse(data) as { delta?: string; text?: string };
              const chunk = parsed.delta ?? parsed.text ?? '';
              if (chunk) onChunk(chunk);
            } catch {
              // Raw text chunk
              if (data) onChunk(data);
            }
          }
        }
      }
      onDone();
    })
    .catch((err: Error) => {
      if (err.name !== 'AbortError') onError(new Event('error'));
    });

  // Return cancel function
  return () => controller.abort();
}

export async function getAIConversations(): Promise<
  Array<{ id: string; title: string; updatedAt: number }>
> {
  const { data } = await apiClient.get<Array<{ id: string; title: string; updatedAt: number }>>(
    '/api/v1/ai/conversations'
  );
  return data;
}

export type { LiteraryWork, AIMessage, Transaction };
