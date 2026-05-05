import type { LiteraryWork, NFTToken, WorkSearchResult, ChainStats, WorkType } from './types';

const REST = process.env.NEXT_PUBLIC_REST_URL || 'http://localhost:1317';
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || 'http://localhost:3001';

// ── Generic fetch helper ──

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`API error ${res.status} — ${url}`);
  }
  return res.json() as Promise<T>;
}

// ── Chain REST endpoints ──

export async function getAllWorks(): Promise<LiteraryWork[]> {
  const data = await apiFetch<{ works: LiteraryWork[] }>(`${REST}/tamizhi/literature/v1/works`);
  return data.works ?? [];
}

export async function getWork(workId: string): Promise<LiteraryWork> {
  const data = await apiFetch<{ work: LiteraryWork }>(
    `${REST}/tamizhi/literature/v1/works/${encodeURIComponent(workId)}`
  );
  return data.work;
}

export async function getWorksByAuthor(author: string): Promise<LiteraryWork[]> {
  const data = await apiFetch<{ works: LiteraryWork[] }>(
    `${REST}/tamizhi/literature/v1/works/author/${encodeURIComponent(author)}`
  );
  return data.works ?? [];
}

export async function getWorksCount(): Promise<number> {
  const data = await apiFetch<{ count: number | string }>(
    `${REST}/tamizhi/literature/v1/works/count`
  );
  return typeof data.count === 'string' ? parseInt(data.count, 10) : data.count;
}

export async function getNFTsForWork(workId: string): Promise<NFTToken[]> {
  try {
    const data = await apiFetch<{ nfts: NFTToken[] }>(
      `${REST}/tamizhi/nft/v1/nfts/work/${encodeURIComponent(workId)}`
    );
    return data.nfts ?? [];
  } catch {
    // Route may not exist on all chain versions
    return [];
  }
}

// ── Explorer API endpoints ──

export interface ExplorerWorkFilter {
  work_type?: WorkType;
  language?: string;
  verified?: boolean;
  limit?: number;
  offset?: number;
}

export async function getExplorerWorks(filter: ExplorerWorkFilter = {}): Promise<LiteraryWork[]> {
  const params = new URLSearchParams();
  if (filter.work_type) params.set('work_type', filter.work_type);
  if (filter.language)  params.set('language', filter.language);
  if (filter.verified !== undefined) params.set('verified', String(filter.verified));
  if (filter.limit !== undefined)    params.set('limit', String(filter.limit));
  if (filter.offset !== undefined)   params.set('offset', String(filter.offset));

  const qs = params.toString();
  const data = await apiFetch<{ works: LiteraryWork[] }>(
    `${EXPLORER}/api/v1/literature${qs ? `?${qs}` : ''}`
  );
  return data.works ?? [];
}

export async function getExplorerWork(workId: string): Promise<LiteraryWork & { tx_history?: unknown[] }> {
  const data = await apiFetch<{ work: LiteraryWork & { tx_history?: unknown[] } }>(
    `${EXPLORER}/api/v1/literature/${encodeURIComponent(workId)}`
  );
  return data.work;
}

export async function searchWorks(query: string): Promise<WorkSearchResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query });
  try {
    const data = await apiFetch<{ results: WorkSearchResult[] }>(
      `${EXPLORER}/api/v1/literature?${params.toString()}`
    );
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function getChainStats(): Promise<ChainStats> {
  try {
    const [countData, explorerData] = await Promise.allSettled([
      apiFetch<{ count: number | string }>(`${REST}/tamizhi/literature/v1/works/count`),
      apiFetch<{ total_works?: number; total_nfts?: number; block_height?: number }>(
        `${EXPLORER}/api/v1/stats`
      ),
    ]);

    const totalWorks =
      countData.status === 'fulfilled'
        ? typeof countData.value.count === 'string'
          ? parseInt(countData.value.count, 10)
          : countData.value.count
        : 0;

    const explorerStats = explorerData.status === 'fulfilled' ? explorerData.value : {};

    return {
      total_works: explorerStats.total_works ?? totalWorks,
      total_nfts: explorerStats.total_nfts ?? 0,
      block_height: explorerStats.block_height,
    };
  } catch {
    return { total_works: 0, total_nfts: 0 };
  }
}
