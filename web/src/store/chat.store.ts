import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  conversationId: string;
  from: string;
  to: string;
  encryptedContent: string;
  decryptedContent?: string;
  timestamp: string;
  isRead: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  nonce?: string;
}

export interface Conversation {
  id: string;
  participantAddress: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  lastActivityAt: string;
  isOnline?: boolean;
  recipientPublicKey?: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: string | null;
  messages: Record<string, ChatMessage[]>; // conversationId -> messages
  isSocketConnected: boolean;
  typingIndicators: Record<string, boolean>; // address -> isTyping
  onlineUsers: Set<string>;
}

interface ChatActions {
  setActiveConversation: (conversationId: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessageStatus: (messageId: string, status: ChatMessage['status']) => void;
  markConversationRead: (conversationId: string) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  setSocketConnected: (connected: boolean) => void;
  setTyping: (address: string, isTyping: boolean) => void;
  setUserOnline: (address: string, online: boolean) => void;
  getMessagesForConversation: (conversationId: string) => ChatMessage[];
  getUnreadCount: () => number;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversation: null,
      messages: {},
      isSocketConnected: false,
      typingIndicators: {},
      onlineUsers: new Set<string>(),

      setActiveConversation: (conversationId) => {
        set({ activeConversation: conversationId });
        if (conversationId) {
          get().markConversationRead(conversationId);
        }
      },

      addMessage: (message) => {
        const { conversationId } = message;
        set((state) => {
          const existingMessages = state.messages[conversationId] || [];
          // Avoid duplicates
          if (existingMessages.some((m) => m.id === message.id)) {
            return state;
          }

          const updatedMessages = [...existingMessages, message].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Update conversation's last message and unread count
          const updatedConversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const isActive = state.activeConversation === conversationId;
              return {
                ...conv,
                lastMessage: message,
                lastActivityAt: message.timestamp,
                unreadCount: isActive ? 0 : conv.unreadCount + (message.from !== conv.participantAddress ? 0 : 1),
              };
            }
            return conv;
          });

          // Create conversation if it doesn't exist
          if (!updatedConversations.some((c) => c.id === conversationId)) {
            updatedConversations.push({
              id: conversationId,
              participantAddress: message.from,
              lastMessage: message,
              unreadCount: 1,
              lastActivityAt: message.timestamp,
            });
          }

          return {
            messages: { ...state.messages, [conversationId]: updatedMessages },
            conversations: updatedConversations.sort(
              (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
            ),
          };
        });
      },

      updateMessageStatus: (messageId, status) => {
        set((state) => {
          const updatedMessages: Record<string, ChatMessage[]> = {};
          for (const [convId, msgs] of Object.entries(state.messages)) {
            updatedMessages[convId] = msgs.map((m) =>
              m.id === messageId ? { ...m, status } : m
            );
          }
          return { messages: updatedMessages };
        });
      },

      markConversationRead: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          ),
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).map((m) => ({
              ...m,
              isRead: true,
            })),
          },
        }));
      },

      addConversation: (conversation) => {
        set((state) => {
          if (state.conversations.some((c) => c.id === conversation.id)) {
            return state;
          }
          return {
            conversations: [conversation, ...state.conversations],
          };
        });
      },

      updateConversation: (conversationId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, ...updates } : conv
          ),
        }));
      },

      setSocketConnected: (connected) => set({ isSocketConnected: connected }),

      setTyping: (address, isTyping) => {
        set((state) => ({
          typingIndicators: { ...state.typingIndicators, [address]: isTyping },
        }));
        if (isTyping) {
          setTimeout(() => {
            set((state) => ({
              typingIndicators: { ...state.typingIndicators, [address]: false },
            }));
          }, 3000);
        }
      },

      setUserOnline: (address, online) => {
        set((state) => {
          const newSet = new Set(state.onlineUsers);
          if (online) {
            newSet.add(address);
          } else {
            newSet.delete(address);
          }
          return { onlineUsers: newSet };
        });
      },

      getMessagesForConversation: (conversationId) => {
        return get().messages[conversationId] || [];
      },

      getUnreadCount: () => {
        return get().conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
      },
    }),
    {
      name: 'tamizhi-chat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        messages: state.messages,
      }),
    }
  )
);
