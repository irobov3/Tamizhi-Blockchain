import axios from 'axios';
import { CONFIG } from '../config';

const restApi = axios.create({
  baseURL: CONFIG.CHAIN_REST_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export interface SessionIDRecord {
  walletAddress: string;
  sessionPubKey: string;
  displayName?: string;
  registeredAt: number;
  lastSeen?: number;
}

export interface GroupRecord {
  groupID: string;
  name: string;
  adminAddress: string;
  members: string[]; // session pub keys
  createdAt: number;
  encrypted: boolean;
}

export interface NodeRecord {
  nodeID: string;
  address: string;
  apiEndpoint: string;
  isActive: boolean;
  stake: string;
}

export interface WalletBalance {
  denom: string;
  amount: string;
}

// ─── Session ID Registry ───────────────────────────────────────────────────

/**
 * Query the session ID for a wallet address.
 */
export async function getSessionID(
  walletAddress: string,
): Promise<SessionIDRecord | null> {
  try {
    const res = await restApi.get<{ record: SessionIDRecord }>(
      `/tamizhi/messaging/v1/session/${walletAddress}`,
    );
    return res.data.record;
  } catch {
    return null;
  }
}

/**
 * Look up a session pub key to find the associated wallet address.
 */
export async function getWalletBySessionID(
  sessionPubKey: string,
): Promise<SessionIDRecord | null> {
  try {
    const res = await restApi.get<{ record: SessionIDRecord }>(
      `/tamizhi/messaging/v1/session/pubkey/${sessionPubKey}`,
    );
    return res.data.record;
  } catch {
    return null;
  }
}

/**
 * Broadcast MsgRegisterSessionID to register a session on chain.
 * In production, sign with the wallet's secp256k1 key.
 */
export async function registerSessionID(params: {
  walletAddress: string;
  sessionPubKey: string;
  displayName?: string;
  signedTx: string; // base64 signed transaction bytes
}): Promise<{ txHash: string }> {
  const res = await restApi.post<{ txHash: string; code: number }>(
    '/cosmos/tx/v1beta1/txs',
    { tx_bytes: params.signedTx, mode: 'BROADCAST_MODE_SYNC' },
  );
  if (res.data.code !== 0) throw new Error('Transaction failed');
  return { txHash: res.data.txHash };
}

// ─── Group Messaging ───────────────────────────────────────────────────────

/**
 * Create a new encrypted group.
 */
export async function createGroup(params: {
  name: string;
  adminAddress: string;
  initialMembers: string[];
  signedTx: string;
}): Promise<{ groupID: string; txHash: string }> {
  const res = await restApi.post<{ groupID: string; txHash: string }>(
    '/cosmos/tx/v1beta1/txs',
    { tx_bytes: params.signedTx, mode: 'BROADCAST_MODE_SYNC' },
  );
  return res.data;
}

/**
 * Get group details by group ID.
 */
export async function getGroup(groupID: string): Promise<GroupRecord | null> {
  try {
    const res = await restApi.get<{ group: GroupRecord }>(
      `/tamizhi/messaging/v1/group/${groupID}`,
    );
    return res.data.group;
  } catch {
    return null;
  }
}

/**
 * Add a member to a group.
 */
export async function addGroupMember(params: {
  groupID: string;
  memberSessionPubKey: string;
  signedTx: string;
}): Promise<{ txHash: string }> {
  const res = await restApi.post<{ txHash: string }>(
    '/cosmos/tx/v1beta1/txs',
    { tx_bytes: params.signedTx, mode: 'BROADCAST_MODE_SYNC' },
  );
  return { txHash: res.data.txHash };
}

/**
 * Remove a member from a group.
 */
export async function removeGroupMember(params: {
  groupID: string;
  memberSessionPubKey: string;
  signedTx: string;
}): Promise<{ txHash: string }> {
  const res = await restApi.post<{ txHash: string }>(
    '/cosmos/tx/v1beta1/txs',
    { tx_bytes: params.signedTx, mode: 'BROADCAST_MODE_SYNC' },
  );
  return { txHash: res.data.txHash };
}

// ─── Storage Node Registry ─────────────────────────────────────────────────

/**
 * Get the list of active storage nodes.
 */
export async function getNodeList(): Promise<NodeRecord[]> {
  try {
    const res = await restApi.get<{ nodes: NodeRecord[] }>(
      '/tamizhi/storage/v1/nodes',
    );
    return res.data.nodes ?? [];
  } catch {
    return [];
  }
}

// ─── Wallet / Bank ─────────────────────────────────────────────────────────

/**
 * Get the TMZ balance for a wallet address.
 */
export async function getBalance(
  walletAddress: string,
): Promise<WalletBalance[]> {
  try {
    const res = await restApi.get<{ balances: WalletBalance[] }>(
      `/cosmos/bank/v1beta1/balances/${walletAddress}`,
    );
    return res.data.balances ?? [];
  } catch {
    return [];
  }
}

/**
 * Format a balance amount from micro-denom to display denom.
 */
export function formatBalance(
  balances: WalletBalance[],
  denom = CONFIG.DENOM,
): string {
  const entry = balances.find((b) => b.denom === denom);
  if (!entry) return `0 ${CONFIG.DISPLAY_DENOM}`;
  const amount = parseInt(entry.amount, 10) / Math.pow(10, CONFIG.DECIMALS);
  return `${amount.toFixed(6)} ${CONFIG.DISPLAY_DENOM}`;
}
