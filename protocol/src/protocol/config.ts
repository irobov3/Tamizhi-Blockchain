import type { TamizhiIdentity } from '../identity/keypair';
import type { MessageStore } from '../storage/message-store';

/**
 * Configuration for the TamizhiProtocol client.
 */
export interface ProtocolConfig {
  /**
   * Cosmos LCD URL for querying the Tamizhi chain.
   * Example: "https://lcd.tamizhi.network"
   */
  lcdUrl: string;

  /**
   * Backend API URL for the Tamizhi key registry and auxiliary services.
   * Example: "https://api.tamizhi.network"
   */
  backendUrl: string;

  /**
   * The local user's identity (keypair + wallet address).
   */
  identity: TamizhiIdentity;

  /**
   * Storage backend for decrypted messages.
   * Defaults to InMemoryMessageStore if not provided.
   */
  messageStore?: MessageStore;

  /**
   * Polling interval in milliseconds for fetching new messages from nodes.
   * Default: 5000 (5 seconds)
   */
  pollIntervalMs?: number;

  /**
   * Message TTL in milliseconds. Default: 30 days.
   * Messages older than this are dropped by nodes.
   */
  messageTtlMs?: number;

  /**
   * Number of onion routing hops. Must be 3 for the current protocol.
   * Reserved for future flexibility.
   */
  onionHops?: number;

  /**
   * Optional auth token for interacting with the backend API (key registry, etc.)
   */
  authToken?: string;

  /**
   * If true, log debug information to console. Default: false.
   */
  debug?: boolean;
}

/**
 * Resolved configuration with all optional fields filled in with defaults.
 */
export interface ResolvedConfig extends Required<ProtocolConfig> {
  messageStore: MessageStore;
}

export const DEFAULT_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const DEFAULT_ONION_HOPS = 3;

/**
 * Merge user-supplied config with defaults to produce a ResolvedConfig.
 */
export function resolveConfig(config: ProtocolConfig): ResolvedConfig {
  // Lazily import InMemoryMessageStore to avoid circular deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { InMemoryMessageStore } = require('../storage/message-store') as typeof import('../storage/message-store');

  return {
    lcdUrl: config.lcdUrl,
    backendUrl: config.backendUrl,
    identity: config.identity,
    messageStore: config.messageStore ?? new InMemoryMessageStore(),
    pollIntervalMs: config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    messageTtlMs: config.messageTtlMs ?? DEFAULT_MESSAGE_TTL_MS,
    onionHops: config.onionHops ?? DEFAULT_ONION_HOPS,
    authToken: config.authToken ?? '',
    debug: config.debug ?? false,
  };
}
