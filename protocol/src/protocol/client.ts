import { v4 as uuidv4 } from 'uuid';
import { fromHex, toHex } from '@cosmjs/encoding';
import { encryptMessage, decryptMessage, serializeEncryptedMessage, deserializeEncryptedMessage } from '../crypto/encryption';
import { buildOnionPacket, selectOnionPath } from '../routing/onion';
import type { NodeInfo } from '../routing/onion';
import { fetchNodeList, sendToNode, fetchMessages, acknowledgeMessages } from '../transport/node-client';
import type { StoredMessage } from '../transport/node-client';
import { TamizhiMessage, InMemoryMessageStore } from '../storage/message-store';
import type { MessageStore, ConversationSummary } from '../storage/message-store';
import { lookupPublicKey } from '../identity/key-registry';
import type { PublicIdentity } from '../identity/keypair';
import { resolveConfig } from './config';
import type { ProtocolConfig, ResolvedConfig } from './config';
import { encryptGroupMessage, decryptGroupMessage } from './group';
import type { GroupSession, EncryptedGroupMessage } from './group';
import { addressToConversationId, isValidTamizhiAddress } from '../util/address';

type MessageHandler = (msg: TamizhiMessage) => void;
type DeliveryHandler = (id: string) => void;

/**
 * The main Tamizhi Protocol client.
 *
 * Provides a high-level API for:
 * - Sending encrypted, onion-routed messages
 * - Polling for incoming messages from service nodes
 * - Group messaging
 * - Conversation management
 * - Public key lookup via the key registry
 */
export class TamizhiProtocol {
  private config: ResolvedConfig;
  private nodes: NodeInfo[] = [];
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandlers: MessageHandler[] = [];
  private deliveryHandlers: DeliveryHandler[] = [];
  private lastPollTimestamp: number = 0;
  private connected: boolean = false;

  constructor(config: ProtocolConfig) {
    this.config = resolveConfig(config);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Connect to the Tamizhi network: fetch the validator/node list and start polling.
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.log('Connecting to Tamizhi network...');
    this.nodes = await fetchNodeList(this.config.lcdUrl);

    if (this.nodes.length < 3) {
      throw new Error(
        `Insufficient service nodes for onion routing: need 3, got ${this.nodes.length}`
      );
    }

    this.lastPollTimestamp = Date.now() - this.config.pollIntervalMs;
    this.connected = true;
    this.startPolling();
    this.log(`Connected. ${this.nodes.length} nodes available.`);
  }

  /**
   * Disconnect: stop polling and clean up.
   */
  async disconnect(): Promise<void> {
    this.stopPolling();
    this.connected = false;
    this.log('Disconnected.');
  }

  // ── Sending ───────────────────────────────────────────────────────────────

  /**
   * Send an encrypted message to a recipient.
   *
   * Flow:
   *   1. Look up recipient's X25519 public key from the key registry
   *   2. Encrypt the message content with NaCl box (ephemeral sender keypair)
   *   3. Wrap in JSON envelope with sender address and message metadata
   *   4. Build a 3-hop onion packet around the encrypted blob
   *   5. Send to the first onion node
   *   6. Store a local copy with status "sent"
   *
   * @returns The message ID
   */
  async sendMessage(to: string, content: string): Promise<string> {
    if (!isValidTamizhiAddress(to)) {
      throw new Error(`Invalid Tamizhi address: ${to}`);
    }
    if (!this.connected) {
      throw new Error('Not connected. Call connect() first.');
    }

    // 1. Resolve recipient's public key
    const recipientPublicId = await this.lookupPublicKey(to, this.config.backendUrl);
    if (!recipientPublicId) {
      throw new Error(`No public key registered for address: ${to}`);
    }

    const messageId = uuidv4();
    const timestamp = Date.now();

    // 2. Build the message envelope
    const envelope = JSON.stringify({
      id: messageId,
      from: this.config.identity.walletAddress,
      to,
      content,
      timestamp,
    });

    // 3. Encrypt the envelope for the recipient
    const recipientX25519PubKey = fromHex(recipientPublicId.x25519PublicKey);
    const encrypted = encryptMessage(envelope, this.config.identity, recipientX25519PubKey);
    const encryptedWire = serializeEncryptedMessage(encrypted);
    const payloadBytes = new TextEncoder().encode(JSON.stringify(encryptedWire));

    // 4. Build 3-hop onion packet
    const path = selectOnionPath(this.nodes, 3);
    const onionPacket = buildOnionPacket(payloadBytes, path, to);

    // 5. Send to first hop
    await sendToNode(path[0].endpoint, onionPacket);

    // 6. Store local copy
    const localMsg = new TamizhiMessage({
      id: messageId,
      from: this.config.identity.walletAddress,
      to,
      content,
      timestamp,
      status: 'sent',
    });
    await this.config.messageStore.save(localMsg);

    this.log(`Message ${messageId} sent to ${to}`);
    return messageId;
  }

  /**
   * Send a message to all members of a group.
   * Each member receives the group-encrypted message individually via the onion network.
   */
  async sendGroupMessage(
    groupId: string,
    group: GroupSession,
    content: string
  ): Promise<void> {
    const encrypted = encryptGroupMessage(content, group, this.config.identity.walletAddress);
    const payloadStr = JSON.stringify({ type: 'group', ...encrypted });

    // Send to each member individually (excluding ourselves)
    const others = group.members.filter(
      (m) => m !== this.config.identity.walletAddress
    );

    await Promise.all(
      others.map(async (memberAddress) => {
        const recipientPublicId = await this.lookupPublicKey(memberAddress, this.config.backendUrl);
        if (!recipientPublicId) return; // Skip if key not found

        const memberX25519PubKey = fromHex(recipientPublicId.x25519PublicKey);
        const encryptedEnvelope = encryptMessage(
          payloadStr,
          this.config.identity,
          memberX25519PubKey
        );
        const encryptedWire = serializeEncryptedMessage(encryptedEnvelope);
        const payloadBytes = new TextEncoder().encode(JSON.stringify(encryptedWire));

        const path = selectOnionPath(this.nodes, 3);
        const onionPacket = buildOnionPacket(payloadBytes, path, memberAddress);
        await sendToNode(path[0].endpoint, onionPacket);
      })
    );
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  /**
   * Start the background polling loop.
   * Fetches new messages from all known nodes at the configured interval.
   */
  startPolling(): void {
    if (this.pollingTimer) return;

    this.pollingTimer = setInterval(async () => {
      await this.poll();
    }, this.config.pollIntervalMs);

    // Trigger an immediate poll
    void this.poll();
  }

  /**
   * Stop the background polling loop.
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Perform one polling cycle: fetch messages from all nodes, decrypt, store, and dispatch.
   */
  private async poll(): Promise<void> {
    if (this.nodes.length === 0) return;

    const myAddress = this.config.identity.walletAddress;
    const since = this.lastPollTimestamp;
    this.lastPollTimestamp = Date.now();

    // Query all nodes in parallel, fail silently per-node
    const results = await Promise.allSettled(
      this.nodes.map((node) => fetchMessages(node.endpoint, myAddress, since))
    );

    const allMessages: { node: NodeInfo; storedMsg: StoredMessage }[] = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        for (const msg of result.value) {
          allMessages.push({ node: this.nodes[idx], storedMsg: msg });
        }
      }
    });

    // Process and decrypt each message
    const processedIds: { node: NodeInfo; ids: string[] }[] = [];

    for (const { node, storedMsg } of allMessages) {
      try {
        const decrypted = await this.decryptStoredMessage(storedMsg);
        if (!decrypted) continue;

        await this.config.messageStore.save(decrypted);
        this.messageHandlers.forEach((h) => h(decrypted));

        // Track for acknowledgement
        let nodeEntry = processedIds.find((e) => e.node.endpoint === node.endpoint);
        if (!nodeEntry) {
          nodeEntry = { node, ids: [] };
          processedIds.push(nodeEntry);
        }
        nodeEntry.ids.push(storedMsg.id);
      } catch (err) {
        this.log(`Failed to process message ${storedMsg.id}: ${err}`);
      }
    }

    // Acknowledge processed messages
    await Promise.allSettled(
      processedIds.map(({ node, ids }) =>
        acknowledgeMessages(node.endpoint, ids)
      )
    );
  }

  /**
   * Decrypt a StoredMessage received from a node.
   * Returns null if decryption fails or the message is not intended for us.
   */
  private async decryptStoredMessage(
    storedMsg: StoredMessage
  ): Promise<TamizhiMessage | null> {
    try {
      const encryptedWire = JSON.parse(storedMsg.encryptedPayload);
      const encrypted = deserializeEncryptedMessage(encryptedWire);
      const envelopeStr = decryptMessage(encrypted, this.config.identity);
      const envelope = JSON.parse(envelopeStr) as {
        id: string;
        from: string;
        to: string;
        content: string;
        timestamp: number;
      };

      return new TamizhiMessage({
        id: envelope.id ?? storedMsg.id,
        from: envelope.from,
        to: envelope.to,
        content: envelope.content,
        timestamp: envelope.timestamp,
        status: 'delivered',
      });
    } catch {
      return null;
    }
  }

  // ── Event Callbacks ───────────────────────────────────────────────────────

  /**
   * Register a callback to be invoked when a new message is received.
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Register a callback to be invoked when a message delivery is confirmed.
   */
  onDelivery(handler: DeliveryHandler): void {
    this.deliveryHandlers.push(handler);
  }

  /**
   * Remove all registered message and delivery handlers.
   */
  removeAllHandlers(): void {
    this.messageHandlers = [];
    this.deliveryHandlers = [];
  }

  // ── Conversation queries ──────────────────────────────────────────────────

  /**
   * Retrieve a list of all conversations for the current user.
   */
  async getConversations(): Promise<ConversationSummary[]> {
    return this.config.messageStore.getConversations(this.config.identity.walletAddress);
  }

  /**
   * Retrieve messages in a conversation with a specific address.
   * Returns messages newest-first (for display in chat UI, reverse before rendering).
   */
  async getMessages(
    withAddress: string,
    limit: number = 50
  ): Promise<TamizhiMessage[]> {
    return this.config.messageStore.getConversation(
      this.config.identity.walletAddress,
      withAddress,
      limit,
      0
    );
  }

  /**
   * Mark messages as read by their IDs.
   */
  async markRead(ids: string[]): Promise<void> {
    await this.config.messageStore.markRead(ids);
  }

  // ── Public Key Registry ───────────────────────────────────────────────────

  /**
   * Look up the public identity of a wallet address from the Tamizhi key registry.
   * Results are cached locally for 10 minutes.
   */
  async lookupPublicKey(
    address: string,
    backendUrl: string
  ): Promise<PublicIdentity | null> {
    return lookupPublicKey(address, backendUrl);
  }

  // ── Node management ───────────────────────────────────────────────────────

  /**
   * Refresh the node list from the chain LCD endpoint.
   * Call this periodically (e.g., every hour) to pick up new validators.
   */
  async refreshNodes(): Promise<void> {
    this.nodes = await fetchNodeList(this.config.lcdUrl);
    this.log(`Node list refreshed: ${this.nodes.length} nodes`);
  }

  /**
   * Return the current known node list.
   */
  getNodes(): NodeInfo[] {
    return [...this.nodes];
  }

  /**
   * Return the wallet address of the current user.
   */
  get myAddress(): string {
    return this.config.identity.walletAddress;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private log(msg: string): void {
    if (this.config.debug) {
      console.log(`[TamizhiProtocol] ${msg}`);
    }
  }
}
