/**
 * @tamizhi/protocol — Tamizhi Decentralized Messaging Protocol
 *
 * Entry point. Re-exports the TamizhiProtocol client class and all submodules
 * so consumers can import from a single package path.
 *
 * Usage:
 *   import { TamizhiProtocol, identityFromMnemonic } from '@tamizhi/protocol';
 */

// ── Main client ──────────────────────────────────────────────────────────────
export { TamizhiProtocol } from './protocol/client';

// ── Identity ─────────────────────────────────────────────────────────────────
export {
  identityFromMnemonic,
  identityFromPrivateKey,
  deriveX25519FromSecp256k1,
  exportPublicIdentity,
  isValidAddress,
} from './identity/keypair';
export type { TamizhiIdentity, PublicIdentity } from './identity/keypair';

// ── Key Registry ──────────────────────────────────────────────────────────────
export {
  registerPublicKey,
  lookupPublicKey,
  lookupPublicKeysBatch,
  cachePublicKey,
  getCachedPublicKey,
  evictCachedPublicKey,
  clearKeyCache,
  keyCacheSize,
} from './identity/key-registry';

// ── Encryption ────────────────────────────────────────────────────────────────
export {
  encryptMessage,
  decryptMessage,
  encryptOnionLayer,
  decryptOnionLayer,
  signMessage,
  verifySignature,
  serializeEncryptedMessage,
  deserializeEncryptedMessage,
} from './crypto/encryption';
export type { EncryptedMessage, OnionLayer, EncryptedMessageWire } from './crypto/encryption';

// ── Onion Routing ─────────────────────────────────────────────────────────────
export {
  buildOnionPacket,
  peelOnionLayer,
  selectOnionPath,
  shuffleNodes,
} from './routing/onion';
export type { NodeInfo, OnionPacket } from './routing/onion';

// ── Transport ─────────────────────────────────────────────────────────────────
export {
  fetchNodeList,
  sendToNode,
  fetchMessages,
  acknowledgeMessages,
  getNodeHealth,
  submitMessage,
} from './transport/node-client';
export type { StoredMessage, NodeHealth } from './transport/node-client';

// ── Storage ───────────────────────────────────────────────────────────────────
export { TamizhiMessage, InMemoryMessageStore } from './storage/message-store';
export type {
  MessageStore,
  MessageStatus,
  ConversationSummary,
} from './storage/message-store';

// ── Protocol config ───────────────────────────────────────────────────────────
export { resolveConfig, DEFAULT_POLL_INTERVAL_MS, DEFAULT_MESSAGE_TTL_MS } from './protocol/config';
export type { ProtocolConfig, ResolvedConfig } from './protocol/config';

// ── Group messaging ───────────────────────────────────────────────────────────
export {
  createGroup,
  addMember,
  removeMember,
  encryptGroupMessage,
  decryptGroupMessage,
  decryptGroupKey,
  loadGroupSession,
} from './protocol/group';
export type {
  GroupSession,
  EncryptedGroupMessage,
  EncryptedGroupKey,
} from './protocol/group';

// ── Utilities ─────────────────────────────────────────────────────────────────
export {
  isValidTamizhiAddress,
  truncateAddress,
  addressToConversationId,
  formatMessageTimestamp,
  peerAddressFromConversationId,
  addressToHex,
  addressesEqual,
} from './util/address';
