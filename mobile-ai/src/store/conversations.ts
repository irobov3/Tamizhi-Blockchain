// Conversation store: persisted to expo-secure-store. Zustand-backed.

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'tamizhi_ai_conversations';
// SecureStore has a 2KB limit per value on some platforms. We chunk if needed.
const MAX_VALUE_BYTES = 2000;

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ConvState {
  conversations: Conversation[];
  activeId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  newConversation: (title?: string) => Conversation;
  setActive: (id: string | null) => void;
  appendMessage: (id: string, msg: Omit<Message, 'id' | 'timestamp'> & { timestamp?: number }) => void;
  updateLastAssistant: (id: string, content: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
}

async function persistAll(list: Conversation[]) {
  try {
    const json = JSON.stringify(list);
    if (json.length <= MAX_VALUE_BYTES) {
      await SecureStore.setItemAsync(STORAGE_KEY, json);
      await SecureStore.setItemAsync(STORAGE_KEY + '_chunks', '0');
    } else {
      // Chunk the JSON across multiple keys.
      const chunks = Math.ceil(json.length / MAX_VALUE_BYTES);
      for (let i = 0; i < chunks; i++) {
        const slice = json.slice(i * MAX_VALUE_BYTES, (i + 1) * MAX_VALUE_BYTES);
        await SecureStore.setItemAsync(`${STORAGE_KEY}_${i}`, slice);
      }
      await SecureStore.setItemAsync(STORAGE_KEY + '_chunks', String(chunks));
    }
  } catch (err) {
    console.warn('persist conversations failed', err);
  }
}

async function loadAll(): Promise<Conversation[]> {
  try {
    const chunkStr = await SecureStore.getItemAsync(STORAGE_KEY + '_chunks');
    const chunks = chunkStr ? parseInt(chunkStr, 10) : 0;
    let json: string | null = null;
    if (chunks > 0) {
      json = '';
      for (let i = 0; i < chunks; i++) {
        const part = await SecureStore.getItemAsync(`${STORAGE_KEY}_${i}`);
        if (part) json += part;
      }
    } else {
      json = await SecureStore.getItemAsync(STORAGE_KEY);
    }
    return json ? (JSON.parse(json) as Conversation[]) : [];
  } catch (err) {
    console.warn('load conversations failed', err);
    return [];
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useConversations = create<ConvState>((set, get) => ({
  conversations: [],
  activeId: null,
  hydrated: false,

  hydrate: async () => {
    const list = await loadAll();
    set({ conversations: list, hydrated: true });
  },

  newConversation: (title = 'New chat') => {
    const conv: Conversation = {
      id: uid(),
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [conv, ...get().conversations];
    set({ conversations: next, activeId: conv.id });
    persistAll(next);
    return conv;
  },

  setActive: (id) => set({ activeId: id }),

  appendMessage: (id, msg) => {
    const list = get().conversations.map((c) => {
      if (c.id !== id) return c;
      const newMsg: Message = {
        id: uid(),
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ?? Date.now(),
      };
      const updated = { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() };
      // Auto-title from first user message
      if (c.title === 'New chat' && msg.role === 'user') {
        updated.title = msg.content.slice(0, 40);
      }
      return updated;
    });
    set({ conversations: list });
    persistAll(list);
  },

  updateLastAssistant: (id, content) => {
    const list = get().conversations.map((c) => {
      if (c.id !== id) return c;
      const msgs = [...c.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content };
      } else {
        msgs.push({ id: uid(), role: 'assistant', content, timestamp: Date.now() });
      }
      return { ...c, messages: msgs, updatedAt: Date.now() };
    });
    set({ conversations: list });
    // Avoid persisting on every token; persist when stream completes (caller does).
  },

  deleteConversation: (id) => {
    const list = get().conversations.filter((c) => c.id !== id);
    set({
      conversations: list,
      activeId: get().activeId === id ? null : get().activeId,
    });
    persistAll(list);
  },

  renameConversation: (id, title) => {
    const list = get().conversations.map((c) => (c.id === id ? { ...c, title } : c));
    set({ conversations: list });
    persistAll(list);
  },
}));

export async function flushConversations() {
  await persistAll(useConversations.getState().conversations);
}
