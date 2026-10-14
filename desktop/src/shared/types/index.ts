// ── Stored types (SQLite rows) ─────────────────────────────────────────────

export interface StoredMessage {
  id: string;
  conversation_id: string;
  sender: string;
  recipient: string;
  body?: string;
  ciphertext?: string;
  nonce?: string;
  ephemeral_pub_key?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'system';
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  is_outgoing: boolean;
}

export interface ConversationRow {
  id: string;
  address: string;
  label?: string;
  last_message?: string;
  last_message_at?: number;
  unread_count: number;
  is_encrypted: boolean;
  created_at: number;
  updated_at: number;
}

export interface StoredWallet {
  id?: number;
  address: string;
  public_key: string;
  encrypted_mnemonic: string;
  x25519_public: string;
  created_at?: number;
}

export interface ContactRow {
  address: string;
  label: string;
  x25519_public?: string;
  verified: boolean;
  created_at: number;
  updated_at: number;
}

// ── Wallet / Chain types ───────────────────────────────────────────────────

export interface WalletInfo {
  address: string;
  publicKey: string;
  mnemonic?: string;
  x25519Public: string;
  x25519Secret?: string; // only available at generation time
  balance?: BalanceResponse;
}

export interface BalanceResponse {
  denom: string;
  amount: string;
  formattedAmount: string;
  usdValue?: number;
}

export interface Transaction {
  hash: string;
  height: number;
  timestamp: string;
  type: string;
  from?: string;
  to?: string;
  amount?: string;
  denom?: string;
  fee?: string;
  memo?: string;
  status: 'success' | 'failed';
}

// ── Messaging types ────────────────────────────────────────────────────────

export interface EncryptedMessage {
  ciphertext: string;
  nonce: string;
  ephemeralPubKey: string;
}

export interface OnionPacket {
  id: string;
  route: string[];
  payload: string; // encrypted
  timestamp: number;
  ttl: number;
}

export interface NodeInfo {
  id: string;
  address: string;
  publicKey: string;
  x25519Public: string;
  endpoint: string;
  country?: string;
  uptime?: number;
  latency?: number;
}

// ── Literature types ───────────────────────────────────────────────────────

export interface LiteraryWork {
  id: string;
  title: string;
  author: string;
  period?: string;
  genre: 'sangam' | 'bhakti' | 'epic' | 'modern' | 'grammar' | 'other';
  language: 'classical-tamil' | 'modern-tamil';
  summary?: string;
  content?: string;
  wordCount?: number;
  chainProofHash?: string;
  chainHeight?: number;
  uploadedBy?: string;
  uploadedAt?: number;
  coverImageUrl?: string;
  tags?: string[];
}

// ── Chain/Explorer types ──────────────────────────────────────────────────

export interface BlockInfo {
  height: number;
  hash: string;
  timestamp: string;
  proposer: string;
  txCount: number;
  size?: number;
}

export interface ValidatorInfo {
  address: string;
  moniker: string;
  votingPower: string;
  commission: string;
  uptime: number;
  status: 'active' | 'inactive' | 'jailed';
  website?: string;
}

export interface ChainStats {
  latestHeight: number;
  totalTxCount: number;
  bondedTokens: string;
  inflationRate: string;
  communityPoolBalance: string;
  activeValidators: number;
}

// ── AI types ──────────────────────────────────────────────────────────────

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
}

// ── IPC Bridge type declaration ────────────────────────────────────────────

export interface TamizhiBridge {
  minimize: () => Promise<void>;
  maximize: () => Promise<boolean>;
  close: () => Promise<void>;

  db: {
    getMessages: (conversationId: string) => Promise<StoredMessage[]>;
    saveMessage: (msg: StoredMessage) => Promise<{ success: boolean }>;
    getConversations: () => Promise<ConversationRow[]>;
    getWallet: () => Promise<StoredWallet | null>;
    saveWallet: (wallet: StoredWallet) => Promise<{ success: boolean }>;
    getContacts: () => Promise<ContactRow[]>;
    saveContact: (
      address: string,
      label: string
    ) => Promise<{ success: boolean }>;
    updateMessageStatus: (
      id: string,
      status: string
    ) => Promise<{ success: boolean }>;
    markConversationRead: (id: string) => Promise<{ success: boolean }>;
    upsertConversation: (conv: ConversationRow) => Promise<{ success: boolean }>;
    deleteConversation: (id: string) => Promise<{ success: boolean }>;
  };

  crypto: {
    generateWallet: (mnemonic?: string) => Promise<{
      mnemonic: string;
      address: string;
      publicKey: string;
      x25519Public: string;
      x25519Secret: string;
    }>;
    encryptMessage: (args: {
      plaintext: string;
      recipientX25519Public: string;
      senderX25519Secret: string;
    }) => Promise<EncryptedMessage>;
    decryptMessage: (args: {
      ciphertext: string;
      nonce: string;
      ephemeralPubKey: string;
      recipientX25519Secret: string;
    }) => Promise<string>;
    sign: (args: {
      data: string;
      privateKey: string;
    }) => Promise<string>;
    deriveX25519: (mnemonic: string) => Promise<{
      x25519Public: string;
      x25519Secret: string;
    }>;
  };

  openExternal: (url: string) => Promise<{ success: boolean }>;
  copyToClipboard: (text: string) => Promise<{ success: boolean }>;
  showNotification: (title: string, body: string) => Promise<{ success: boolean }>;
  getVersion: () => Promise<string>;

  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string) => void;
  once: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    tamizhi: TamizhiBridge;
  }
}
