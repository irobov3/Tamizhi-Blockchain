import { v4 as uuidv4 } from 'uuid';

/**
 * Delivery/read status of a message.
 */
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

/**
 * A fully decrypted Tamizhi message stored locally.
 */
export class TamizhiMessage {
  readonly id: string;
  readonly from: string;       // sender wallet address
  readonly to: string;         // recipient wallet address
  readonly content: string;    // decrypted plaintext
  readonly timestamp: number;  // unix ms, set by sender
  readonly conversationId: string; // deterministic ID from sorted pair of addresses
  status: MessageStatus;
  receivedAt: number;          // local unix ms when message was first stored

  constructor(params: {
    id?: string;
    from: string;
    to: string;
    content: string;
    timestamp: number;
    status?: MessageStatus;
    conversationId?: string;
  }) {
    this.id = params.id ?? uuidv4();
    this.from = params.from;
    this.to = params.to;
    this.content = params.content;
    this.timestamp = params.timestamp;
    this.status = params.status ?? 'sent';
    this.receivedAt = Date.now();

    // Deterministic conversation ID: sorted addresses joined by ":"
    this.conversationId =
      params.conversationId ??
      [params.from, params.to].sort().join(':');
  }
}

/**
 * A summary entry for conversations list view.
 */
export interface ConversationSummary {
  conversationId: string;
  peerAddress: string;      // the other party's address
  lastMessage: TamizhiMessage;
  unreadCount: number;
  totalCount: number;
}

/**
 * Core storage interface. Implementations may be in-memory, SQLite, IndexedDB, etc.
 */
export interface MessageStore {
  /** Persist a message. Overwrites if same ID exists. */
  save(msg: TamizhiMessage): Promise<void>;

  /** Retrieve all messages where from or to matches address. */
  getAll(address: string): Promise<TamizhiMessage[]>;

  /**
   * Retrieve messages between two addresses in a conversation,
   * newest-first, with pagination.
   */
  getConversation(
    addrA: string,
    addrB: string,
    limit: number,
    offset: number
  ): Promise<TamizhiMessage[]>;

  /** Get all distinct conversations for an address, with summary info. */
  getConversations(myAddress: string): Promise<ConversationSummary[]>;

  /** Mark messages as read by their IDs. */
  markRead(ids: string[]): Promise<void>;

  /** Delete a single message by ID. */
  delete(id: string): Promise<void>;

  /** Wipe all stored messages. */
  clear(): Promise<void>;

  /** Count of stored messages. */
  count(): Promise<number>;
}

/**
 * In-memory implementation of MessageStore — suitable for testing and ephemeral sessions.
 * Not persisted across process restarts.
 */
export class InMemoryMessageStore implements MessageStore {
  private messages: Map<string, TamizhiMessage> = new Map();

  async save(msg: TamizhiMessage): Promise<void> {
    this.messages.set(msg.id, msg);
  }

  async getAll(address: string): Promise<TamizhiMessage[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.from === address || m.to === address)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async getConversation(
    addrA: string,
    addrB: string,
    limit: number,
    offset: number
  ): Promise<TamizhiMessage[]> {
    const all = Array.from(this.messages.values())
      .filter(
        (m) =>
          (m.from === addrA && m.to === addrB) ||
          (m.from === addrB && m.to === addrA)
      )
      .sort((a, b) => b.timestamp - a.timestamp); // newest first

    return all.slice(offset, offset + limit);
  }

  async getConversations(myAddress: string): Promise<ConversationSummary[]> {
    const myMessages = Array.from(this.messages.values()).filter(
      (m) => m.from === myAddress || m.to === myAddress
    );

    // Group by conversationId
    const grouped = new Map<string, TamizhiMessage[]>();
    for (const msg of myMessages) {
      const list = grouped.get(msg.conversationId) ?? [];
      list.push(msg);
      grouped.set(msg.conversationId, list);
    }

    const summaries: ConversationSummary[] = [];

    for (const [convId, msgs] of grouped) {
      const sorted = msgs.sort((a, b) => b.timestamp - a.timestamp);
      const lastMessage = sorted[0];
      const peerAddress = lastMessage.from === myAddress ? lastMessage.to : lastMessage.from;
      const unreadCount = msgs.filter(
        (m) => m.to === myAddress && m.status !== 'read'
      ).length;

      summaries.push({
        conversationId: convId,
        peerAddress,
        lastMessage,
        unreadCount,
        totalCount: msgs.length,
      });
    }

    // Sort by most recent first
    return summaries.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
  }

  async markRead(ids: string[]): Promise<void> {
    for (const id of ids) {
      const msg = this.messages.get(id);
      if (msg) {
        msg.status = 'read';
      }
    }
  }

  async delete(id: string): Promise<void> {
    this.messages.delete(id);
  }

  async clear(): Promise<void> {
    this.messages.clear();
  }

  async count(): Promise<number> {
    return this.messages.size;
  }
}
