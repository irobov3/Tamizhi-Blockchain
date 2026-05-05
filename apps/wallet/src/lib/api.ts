import axios from 'axios';

const REST = process.env.NEXT_PUBLIC_REST_URL || 'http://localhost:1317';
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || 'http://localhost:3001';

// --- Types ---

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

// --- Helpers ---

function utmzToTmz(utmz: string): string {
  const val = parseInt(utmz, 10);
  if (isNaN(val)) return '0';
  return (val / 1_000_000).toFixed(6);
}

// --- API Functions ---

export async function getRewardRecords(employeeId: string): Promise<RewardRecord[]> {
  const res = await axios.get(`${REST}/tamizhi/rewards/v1/records/${employeeId}`);
  return res.data?.records ?? res.data ?? [];
}

export async function getRewardRules(): Promise<RewardRule[]> {
  const res = await axios.get(`${REST}/tamizhi/rewards/v1/rules`);
  return res.data?.rules ?? res.data ?? [];
}

export async function getActiveNodes(): Promise<ChainNode[]> {
  const res = await axios.get(`${REST}/tamizhi/nodes/v1/nodes`);
  return res.data?.nodes ?? res.data ?? [];
}

export async function getAccessLogs(employeeId: string): Promise<AccessLog[]> {
  const res = await axios.get(`${REST}/tamizhi/accesslog/v1/logs/employee/${employeeId}`);
  return res.data?.logs ?? res.data ?? [];
}

export async function getLiteratureWorks(): Promise<LiteratureWork[]> {
  const res = await axios.get(`${REST}/tamizhi/literature/v1/works`);
  return res.data?.works ?? res.data ?? [];
}

export async function getChainStats(): Promise<ChainStats> {
  const res = await axios.get(`${EXPLORER}/api/v1/stats`);
  return res.data;
}

export { utmzToTmz };
