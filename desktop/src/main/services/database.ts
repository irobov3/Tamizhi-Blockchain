import BetterSqlite3 from 'better-sqlite3';
import type {
  StoredMessage,
  ConversationRow,
  StoredWallet,
  ContactRow,
} from '../../shared/types';

class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath, {
      verbose: process.env.NODE_ENV !== 'production' ? console.log : undefined,
    });
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
  }

  initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        label TEXT,
        last_message TEXT,
        last_message_at INTEGER,
        unread_count INTEGER DEFAULT 0,
        is_encrypted INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        body TEXT,
        ciphertext TEXT,
        nonce TEXT,
        ephemeral_pub_key TEXT,
        status TEXT NOT NULL DEFAULT 'sending',
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        attachment_url TEXT,
        attachment_name TEXT,
        attachment_size INTEGER,
        is_outgoing INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
        ON messages(conversation_id, timestamp DESC);

      CREATE TABLE IF NOT EXISTS wallet (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        address TEXT NOT NULL,
        public_key TEXT NOT NULL,
        encrypted_mnemonic TEXT NOT NULL,
        x25519_public TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS contacts (
        address TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        x25519_public TEXT,
        verified INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  saveMessage(msg: StoredMessage): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO messages (
        id, conversation_id, sender, recipient, body,
        ciphertext, nonce, ephemeral_pub_key, status,
        timestamp, type, attachment_url, attachment_name,
        attachment_size, is_outgoing
      ) VALUES (
        @id, @conversation_id, @sender, @recipient, @body,
        @ciphertext, @nonce, @ephemeral_pub_key, @status,
        @timestamp, @type, @attachment_url, @attachment_name,
        @attachment_size, @is_outgoing
      )
    `);
    stmt.run({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender: msg.sender,
      recipient: msg.recipient,
      body: msg.body ?? null,
      ciphertext: msg.ciphertext ?? null,
      nonce: msg.nonce ?? null,
      ephemeral_pub_key: msg.ephemeral_pub_key ?? null,
      status: msg.status,
      timestamp: msg.timestamp,
      type: msg.type,
      attachment_url: msg.attachment_url ?? null,
      attachment_name: msg.attachment_name ?? null,
      attachment_size: msg.attachment_size ?? null,
      is_outgoing: msg.is_outgoing ? 1 : 0,
    });
  }

  getMessages(
    conversationId: string,
    limit = 100,
    offset = 0
  ): StoredMessage[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE conversation_id = ?
         ORDER BY timestamp ASC
         LIMIT ? OFFSET ?`
      )
      .all(conversationId, limit, offset) as Record<string, unknown>[];

    return rows.map((r) => ({
      ...(r as unknown as StoredMessage),
      is_outgoing: (r.is_outgoing as number) === 1,
    }));
  }

  updateMessageStatus(id: string, status: string): void {
    this.db
      .prepare(`UPDATE messages SET status = ? WHERE id = ?`)
      .run(status, id);
  }

  deleteMessage(id: string): void {
    this.db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
  }

  // ── Conversations ─────────────────────────────────────────────────────────

  getConversations(): ConversationRow[] {
    return this.db
      .prepare(
        `SELECT * FROM conversations ORDER BY last_message_at DESC`
      )
      .all() as ConversationRow[];
  }

  upsertConversation(conv: ConversationRow): void {
    this.db
      .prepare(
        `INSERT INTO conversations (
           id, address, label, last_message, last_message_at,
           unread_count, is_encrypted, created_at, updated_at
         ) VALUES (
           @id, @address, @label, @last_message, @last_message_at,
           @unread_count, @is_encrypted, @created_at, @updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           label = excluded.label,
           last_message = excluded.last_message,
           last_message_at = excluded.last_message_at,
           unread_count = excluded.unread_count,
           updated_at = excluded.updated_at`
      )
      .run({
        id: conv.id,
        address: conv.address,
        label: conv.label ?? null,
        last_message: conv.last_message ?? null,
        last_message_at: conv.last_message_at ?? null,
        unread_count: conv.unread_count ?? 0,
        is_encrypted: conv.is_encrypted ? 1 : 0,
        created_at: conv.created_at ?? Date.now(),
        updated_at: Date.now(),
      });
  }

  markConversationRead(id: string): void {
    this.db
      .prepare(`UPDATE conversations SET unread_count = 0 WHERE id = ?`)
      .run(id);
  }

  deleteConversation(id: string): void {
    const deleteMessages = this.db.prepare(
      `DELETE FROM messages WHERE conversation_id = ?`
    );
    const deleteConv = this.db.prepare(
      `DELETE FROM conversations WHERE id = ?`
    );
    this.db.transaction(() => {
      deleteMessages.run(id);
      deleteConv.run(id);
    })();
  }

  // ── Wallet ────────────────────────────────────────────────────────────────

  saveWallet(wallet: StoredWallet): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO wallet (
           id, address, public_key, encrypted_mnemonic, x25519_public, created_at
         ) VALUES (1, @address, @public_key, @encrypted_mnemonic, @x25519_public, @created_at)`
      )
      .run({
        address: wallet.address,
        public_key: wallet.public_key,
        encrypted_mnemonic: wallet.encrypted_mnemonic,
        x25519_public: wallet.x25519_public,
        created_at: wallet.created_at ?? Date.now(),
      });
  }

  getWallet(): StoredWallet | null {
    const row = this.db
      .prepare(`SELECT * FROM wallet WHERE id = 1`)
      .get() as StoredWallet | undefined;
    return row ?? null;
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  saveContact(address: string, label: string, x25519Public?: string): void {
    this.db
      .prepare(
        `INSERT INTO contacts (address, label, x25519_public, updated_at)
         VALUES (@address, @label, @x25519_public, @updated_at)
         ON CONFLICT(address) DO UPDATE SET
           label = excluded.label,
           x25519_public = COALESCE(excluded.x25519_public, x25519_public),
           updated_at = excluded.updated_at`
      )
      .run({
        address,
        label,
        x25519_public: x25519Public ?? null,
        updated_at: Date.now(),
      });
  }

  getContacts(): ContactRow[] {
    return this.db
      .prepare(`SELECT * FROM contacts ORDER BY label ASC`)
      .all() as ContactRow[];
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  getSetting(key: string): string | null {
    const row = this.db
      .prepare(`SELECT value FROM settings WHERE key = ?`)
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`
      )
      .run(key, value);
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: Database | null = null;

export function getDatabase(dbPath?: string): Database {
  if (!dbInstance) {
    if (!dbPath) throw new Error('Database path required for first initialization');
    dbInstance = new Database(dbPath);
    dbInstance.initialize();
  }
  return dbInstance;
}

export { Database };
