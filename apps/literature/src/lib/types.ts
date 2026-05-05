// ── Core domain types for the Tamizhi literary browser ──

export type WorkType = 'poem' | 'prose' | 'epic' | 'grammar' | 'unknown';

export interface LiteraryWork {
  work_id: string;
  title: string;
  title_transliteration?: string;
  author: string;
  work_type: WorkType;
  language: string;
  century?: string;
  era?: string;
  content_hash: string;
  arweave_id?: string;
  verified: boolean;
  block_height?: number;
  tx_hash?: string;
  submitter?: string;
  created_at?: string;
}

export interface NFTToken {
  token_id: string;
  work_id: string;
  owner: string;
  minted_at?: string;
  tx_hash?: string;
}

export interface WorkSearchResult {
  work_id: string;
  title: string;
  title_transliteration?: string;
  author: string;
  work_type: WorkType;
  language: string;
  verified: boolean;
  match_field?: string; // which field matched the search query
  snippet?: string;     // highlighted excerpt
}

export interface ChainStats {
  total_works: number;
  total_nfts: number;
  total_authors?: number;
  block_height?: number;
}

export interface SubmitWorkPayload {
  title: string;
  title_transliteration: string;
  author: string;
  work_type: WorkType;
  language: string;
  century: string;
  content_hash: string;
  arweave_id?: string;
}
