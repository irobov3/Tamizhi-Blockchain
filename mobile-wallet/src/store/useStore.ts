import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionIdentity } from '../crypto/session';

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: number;
  read: boolean;
  type: 'sent' | 'received';
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  _id: string;
  createdAt: Date;
  user: { _id: string; name?: string; avatar?: string };
}

export interface Contact {
  sessionPubKey: string;
  walletAddress?: string;
  displayName: string;
  avatarColor: string;
  lastSeen?: number;
  isOnline?: boolean;
  addedAt: number;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  peerSessionPubKey?: string;
  groupMembers?: string[];
  lastMessage?: Pick<Message, 'text' | 'timestamp' | 'type'>;
  unreadCount: number;
  messages: Message[];
  avatarColor: string;
  createdAt: number;
}

export interface AppSettings {
  notificationsEnabled: boolean;
  messagePreviewEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  language: string;
}

export interface AppStore {
  identity: SessionIdentity | null;
  isOnboarded: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  contacts: Contact[];
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;

  setIdentity: (identity: SessionIdentity | null) => void;
  setOnboarded: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setActiveConversation: (id: string | null) => void;
  markRead: (convId: string) => void;
  deleteConversation: (convId: string) => void;
  addMessage: (convId: string, msg: Message) => void;
  updateMessageStatus: (convId: string, msgId: string, status: Message['status']) => void;
  addContact: (contact: Contact) => void;
  updateContact: (sessionPubKey: string, updates: Partial<Contact>) => void;
  removeContact: (sessionPubKey: string) => void;
  getContact: (sessionPubKey: string) => Contact | undefined;
  getConversation: (id: string) => Conversation | undefined;
  getSortedConversations: () => Conversation[];
  clearAllData: () => void;
}

const AVATAR_COLORS = [
  '#00b4d8','#00f5d4','#7c4dff','#ff6b6b',
  '#ffd166','#06d6a0','#ef476f','#118ab2',
  '#073b4c','#48cae4','#90e0ef','#ade8f4',
];

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  messagePreviewEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  language: 'en',
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      identity: null,
      isOnboarded: false,
      conversations: [],
      activeConversationId: null,
      contacts: [],
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      setIdentity: (identity) => set({ identity }),
      setOnboarded: (value) => set({ isOnboarded: value }),
      setLoading: (value) => set({ isLoading: value }),
      setError: (error) => set({ error }),
      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),

      addConversation: (conv) =>
        set((state) => {
          if (state.conversations.find((c) => c.id === conv.id)) return state;
          return { conversations: [conv, ...state.conversations] };
        }),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),

      setActiveConversation: (id) => set({ activeConversationId: id }),

      markRead: (convId) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId
              ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, read: true })) }
              : c,
          ),
        })),

      deleteConversation: (convId) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== convId),
          activeConversationId:
            state.activeConversationId === convId ? null : state.activeConversationId,
        })),

      addMessage: (convId, msg) =>
        set((state) => {
          const conv = state.conversations.find((c) => c.id === convId);
          const isActive = state.activeConversationId === convId;

          if (conv) {
            if (conv.messages.some((m) => m.id === msg.id)) return state;
            return {
              conversations: state.conversations.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      messages: [...c.messages, msg],
                      lastMessage: { text: msg.text, timestamp: msg.timestamp, type: msg.type },
                      unreadCount: isActive ? 0 : c.unreadCount + (msg.type === 'received' ? 1 : 0),
                    }
                  : c,
              ),
            };
          }

          const newConv: Conversation = {
            id: convId,
            name: convId.slice(0, 8) + '...',
            type: 'direct',
            peerSessionPubKey: msg.type === 'received' ? msg.senderId : convId,
            messages: [msg],
            lastMessage: { text: msg.text, timestamp: msg.timestamp, type: msg.type },
            unreadCount: isActive ? 0 : msg.type === 'received' ? 1 : 0,
            avatarColor: getAvatarColor(convId),
            createdAt: Date.now(),
          };
          return { conversations: [newConv, ...state.conversations] };
        }),

      updateMessageStatus: (convId, msgId, status) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.map((m) => m.id === msgId ? { ...m, status } : m) }
              : c,
          ),
        })),

      addContact: (contact) =>
        set((state) => {
          if (state.contacts.find((c) => c.sessionPubKey === contact.sessionPubKey)) return state;
          return { contacts: [...state.contacts, contact] };
        }),

      updateContact: (sessionPubKey, updates) =>
        set((state) => ({
          contacts: state.contacts.map((c) =>
            c.sessionPubKey === sessionPubKey ? { ...c, ...updates } : c,
          ),
        })),

      removeContact: (sessionPubKey) =>
        set((state) => ({
          contacts: state.contacts.filter((c) => c.sessionPubKey !== sessionPubKey),
        })),

      getContact: (sessionPubKey) =>
        get().contacts.find((c) => c.sessionPubKey === sessionPubKey),

      getConversation: (id) =>
        get().conversations.find((c) => c.id === id),

      getSortedConversations: () =>
        [...get().conversations].sort((a, b) => {
          const tA = a.lastMessage?.timestamp ?? a.createdAt;
          const tB = b.lastMessage?.timestamp ?? b.createdAt;
          return tB - tA;
        }),

      clearAllData: () =>
        set({
          identity: null,
          isOnboarded: false,
          conversations: [],
          contacts: [],
          activeConversationId: null,
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'tamizhi-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        identity: state.identity,
        isOnboarded: state.isOnboarded,
        conversations: state.conversations,
        contacts: state.contacts,
        settings: state.settings,
      }),
    },
  ),
);
