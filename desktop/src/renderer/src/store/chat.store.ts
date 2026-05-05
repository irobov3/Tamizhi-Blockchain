import { create } from 'zustand';
import type { ConversationRow, StoredMessage } from '../../../shared/types';

interface ChatState {
  conversations: ConversationRow[];
  messages: Record<string, StoredMessage[]>;
  activeConversationId: string | null;
  unreadTotal: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (to: string, content: string, senderAddress: string, x25519Secret: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  markRead: (conversationId: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  addIncomingMessage: (msg: StoredMessage) => void;
  upsertConversation: (conv: ConversationRow) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  unreadTotal: 0,
  isLoading: false,
  error: null,

  // MARK: - Load Conversations

  loadConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await window.tamizhi.db.getConversations();
      const sorted = [...conversations].sort(
        (a, b) => (b.last_message_at ?? 0) - (a.last_message_at ?? 0)
      );
      const unreadTotal = sorted.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);
      set({ conversations: sorted, unreadTotal, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations';
      set({ isLoading: false, error: message });
    }
  },

  // MARK: - Load Messages

  loadMessages: async (conversationId: string) => {
    try {
      const msgs = await window.tamizhi.db.getMessages(conversationId);
      const sorted = [...msgs].sort((a, b) => a.timestamp - b.timestamp);
      set((state) => ({
        messages: { ...state.messages, [conversationId]: sorted },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      set({ error: message });
    }
  },

  // MARK: - Send Message

  sendMessage: async (to: string, content: string, senderAddress: string, x25519Secret: string) => {
    const conversationId = [senderAddress, to].sort().join(':');

    // Get recipient's public key
    let recipientPubKey: string;
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1/identity/${to}`
      );
      if (!resp.ok) throw new Error('Could not fetch recipient public key');
      const data = await resp.json() as { x25519Public: string };
      recipientPubKey = data.x25519Public;
    } catch {
      // Fallback: send unencrypted in dev
      recipientPubKey = '';
    }

    const now = Date.now();
    const msgId = `${now}-${Math.random().toString(36).slice(2)}`;

    // Optimistic message
    const optimisticMsg: StoredMessage = {
      id: msgId,
      conversation_id: conversationId,
      sender: senderAddress,
      recipient: to,
      body: content,
      status: 'sending',
      timestamp: now,
      type: 'text',
      is_outgoing: true,
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), optimisticMsg],
      },
    }));

    try {
      let encryptedMsg: StoredMessage = { ...optimisticMsg };

      if (recipientPubKey) {
        const encrypted = await window.tamizhi.crypto.encryptMessage({
          plaintext: content,
          recipientX25519Public: recipientPubKey,
          senderX25519Secret: x25519Secret,
        });
        encryptedMsg = {
          ...optimisticMsg,
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          ephemeral_pub_key: encrypted.ephemeralPubKey,
          body: undefined,
        };
      }

      // Save to local DB
      await window.tamizhi.db.saveMessage(encryptedMsg);

      // Send to API
      await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: senderAddress,
            to,
            ciphertext: encryptedMsg.ciphertext,
            nonce: encryptedMsg.nonce,
            ephemeralPubKey: encryptedMsg.ephemeral_pub_key,
            body: encryptedMsg.body,
          }),
        }
      );

      // Update status to sent
      set((state) => {
        const convMsgs = state.messages[conversationId] ?? [];
        return {
          messages: {
            ...state.messages,
            [conversationId]: convMsgs.map((m) =>
              m.id === msgId ? { ...m, status: 'sent' as const } : m
            ),
          },
        };
      });

      // Update DB status
      await window.tamizhi.db.updateMessageStatus(msgId, 'sent');

      // Upsert conversation
      const conv: ConversationRow = {
        id: conversationId,
        address: to,
        last_message: content,
        last_message_at: now,
        unread_count: 0,
        is_encrypted: !!recipientPubKey,
        created_at: now,
        updated_at: now,
      };
      await window.tamizhi.db.upsertConversation(conv);
      get().upsertConversation(conv);
    } catch (err) {
      // Mark as failed
      set((state) => {
        const convMsgs = state.messages[conversationId] ?? [];
        return {
          messages: {
            ...state.messages,
            [conversationId]: convMsgs.map((m) =>
              m.id === msgId ? { ...m, status: 'failed' as const } : m
            ),
          },
          error: err instanceof Error ? err.message : 'Send failed',
        };
      });
      await window.tamizhi.db.updateMessageStatus(msgId, 'failed');
    }
  },

  // MARK: - Set Active Conversation

  setActiveConversation: (id: string | null) => {
    set({ activeConversationId: id });
    if (id) {
      get().loadMessages(id);
      get().markRead(id);
    }
  },

  // MARK: - Mark Read

  markRead: async (conversationId: string) => {
    try {
      await window.tamizhi.db.markConversationRead(conversationId);
      set((state) => {
        const updated = state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        );
        const unreadTotal = updated.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);
        return { conversations: updated, unreadTotal };
      });
    } catch {
      // Non-fatal
    }
  },

  // MARK: - Delete Conversation

  deleteConversation: async (id: string) => {
    try {
      await window.tamizhi.db.deleteConversation(id);
      set((state) => {
        const conversations = state.conversations.filter((c) => c.id !== id);
        const messages = { ...state.messages };
        delete messages[id];
        const unreadTotal = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);
        return {
          conversations,
          messages,
          unreadTotal,
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Delete failed' });
    }
  },

  // MARK: - Add Incoming Message

  addIncomingMessage: (msg: StoredMessage) => {
    set((state) => {
      const convId = msg.conversation_id;
      const existing = state.messages[convId] ?? [];

      // Dedup
      if (existing.some((m) => m.id === msg.id)) return state;

      const updated = [...existing, msg].sort((a, b) => a.timestamp - b.timestamp);

      // Update conversation preview
      const conversations = state.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              last_message: msg.body ?? '🔒',
              last_message_at: msg.timestamp,
              unread_count:
                state.activeConversationId === convId ? 0 : (c.unread_count ?? 0) + 1,
            }
          : c
      );

      const unreadTotal = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);

      return {
        messages: { ...state.messages, [convId]: updated },
        conversations,
        unreadTotal,
      };
    });
  },

  // MARK: - Upsert Conversation

  upsertConversation: (conv: ConversationRow) => {
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conv.id);
      let updated: ConversationRow[];
      if (idx >= 0) {
        updated = [...state.conversations];
        updated[idx] = { ...updated[idx], ...conv };
      } else {
        updated = [conv, ...state.conversations];
      }
      updated.sort((a, b) => (b.last_message_at ?? 0) - (a.last_message_at ?? 0));
      return { conversations: updated };
    });
  },

  clearError: () => set({ error: null }),
}));
