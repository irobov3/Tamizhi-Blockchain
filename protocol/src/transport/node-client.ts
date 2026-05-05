import axios, { type AxiosInstance } from 'axios';
import { fromHex, toHex } from '@cosmjs/encoding';
import type { NodeInfo, OnionPacket } from '../routing/onion';

/**
 * A message stored by a validator node, waiting to be fetched by the recipient.
 */
export interface StoredMessage {
  id: string;
  recipientAddress: string;
  encryptedPayload: string;  // hex-encoded EncryptedMessage
  timestamp: number;         // unix ms
  ttl: number;               // expiry unix ms
}

/**
 * Health information for a Tamizhi service node.
 */
export interface NodeHealth {
  nodeAddress: string;
  version: string;
  uptime: number;           // seconds
  messageQueueSize: number;
  connectedPeers: number;
  lastBlockHeight: number;
  status: 'healthy' | 'degraded' | 'offline';
}

/**
 * Raw validator entry returned by the Cosmos LCD /cosmos/staking/v1beta1/validators endpoint.
 */
interface CosmosValidator {
  operator_address: string;
  description: { moniker: string; details?: string };
  tokens: string;
  status: string;
}

/**
 * Parse the node endpoint and X25519 public key from validator description details.
 * Validators register their messaging endpoint as a JSON blob in the description.details field:
 *   {"tmz_endpoint":"https://...", "tmz_x25519_pubkey":"<hex>"}
 */
function parseValidatorDetails(
  details: string | undefined
): { endpoint: string; x25519PublicKey: Uint8Array } | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details) as {
      tmz_endpoint?: string;
      tmz_x25519_pubkey?: string;
    };
    if (!parsed.tmz_endpoint || !parsed.tmz_x25519_pubkey) return null;
    return {
      endpoint: parsed.tmz_endpoint,
      x25519PublicKey: fromHex(parsed.tmz_x25519_pubkey),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the list of active Tamizhi service nodes from the chain LCD endpoint.
 * Filters to bonded validators that have registered a messaging endpoint.
 */
export async function fetchNodeList(lcdUrl: string): Promise<NodeInfo[]> {
  const url = `${lcdUrl.replace(/\/$/, '')}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=200`;

  const response = await axios.get<{ validators: CosmosValidator[] }>(url, { timeout: 10_000 });
  const validators = response.data.validators ?? [];

  const nodes: NodeInfo[] = [];

  for (const v of validators) {
    const details = parseValidatorDetails(v.description?.details);
    if (!details) continue;

    nodes.push({
      address: v.operator_address,
      x25519PublicKey: details.x25519PublicKey,
      endpoint: details.endpoint,
      stake: parseInt(v.tokens ?? '0', 10),
    });
  }

  return nodes;
}

/**
 * Create a per-node Axios instance with a reasonable timeout.
 */
function nodeAxios(endpoint: string): AxiosInstance {
  return axios.create({
    baseURL: endpoint.replace(/\/$/, ''),
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Serialize an OnionPacket for wire transport (binary arrays as hex).
 */
function serializeOnionPacket(packet: OnionPacket): object {
  return {
    version: packet.version,
    layer: {
      ciphertext: toHex(packet.layer.ciphertext),
      nonce: toHex(packet.layer.nonce),
      ephemeralPublicKey: toHex(packet.layer.ephemeralPublicKey),
    },
  };
}

/**
 * Send an onion-routed packet to the first hop node via POST /relay.
 * The node is responsible for peeling its layer and forwarding the rest.
 */
export async function sendToNode(nodeEndpoint: string, onionPacket: OnionPacket): Promise<void> {
  const client = nodeAxios(nodeEndpoint);
  await client.post('/relay', serializeOnionPacket(onionPacket));
}

/**
 * Fetch encrypted messages queued for a recipient on a specific node.
 * `since` is a unix timestamp in milliseconds; only messages after this time are returned.
 */
export async function fetchMessages(
  nodeEndpoint: string,
  recipientAddress: string,
  since: number = 0
): Promise<StoredMessage[]> {
  const client = nodeAxios(nodeEndpoint);
  const response = await client.get<{ messages: StoredMessage[] }>(
    `/messages/${recipientAddress}`,
    { params: { since } }
  );
  return response.data.messages ?? [];
}

/**
 * Acknowledge (delete) a batch of messages from a node after they have been successfully decrypted.
 * Uses DELETE /messages with a JSON body listing message IDs.
 */
export async function acknowledgeMessages(
  nodeEndpoint: string,
  messageIds: string[]
): Promise<void> {
  if (messageIds.length === 0) return;
  const client = nodeAxios(nodeEndpoint);
  await client.delete('/messages', { data: { ids: messageIds } });
}

/**
 * Query the health endpoint of a service node.
 */
export async function getNodeHealth(nodeEndpoint: string): Promise<NodeHealth> {
  const client = nodeAxios(nodeEndpoint);
  const response = await client.get<NodeHealth>('/health');
  return response.data;
}

/**
 * Submit an encrypted message blob directly to a node for delivery to a recipient.
 * This is used by the final hop node to store the message for the recipient to fetch.
 */
export async function submitMessage(
  nodeEndpoint: string,
  recipientAddress: string,
  encryptedPayload: string,
  ttlMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): Promise<string> {
  const client = nodeAxios(nodeEndpoint);
  const response = await client.post<{ messageId: string }>('/submit', {
    recipientAddress,
    encryptedPayload,
    ttl: Date.now() + ttlMs,
  });
  return response.data.messageId;
}
