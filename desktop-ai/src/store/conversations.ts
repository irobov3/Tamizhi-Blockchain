import { create } from 'zustand';
import { LazyStore } from '@tauri-apps/plugin-store';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
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

interface ConversationsState {
  conversations: Conversation[];
  activeId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  newConversation: (title?: string) => string;
  setActive: (id: string) => void;
  appendMessage: (id: string, m: Omit<Message, 'id' | 'timestamp'>) => void;
  updateLastAssistant: (id: string, content: string) => void;
  deleteConversation: (id: string) => void;
  rename: (id: string, title: string) => void;
}

const STORE_FILE = 'conversations.json';
const KEY = 'conversations';
const ACTIVE_KEY = 'activeId';

let _store: LazyStore | null = null;
function store(): LazyStore {
  if (!_store) _store = new LazyStore(STORE_FILE);
  return _store;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function persist(state: ConversationsState) {
  try {
    const s = store();
    await s.set(KEY, state.conversations);
    await s.set(ACTIVE_KEY, state.activeId);
    await s.save();
  } catch (err) {
    // Outside Tauri (browser dev) – ignore.
    console.warn('persist conversations failed', err);
  }
}

export const useConversations = create<ConversationsState>((set, get) => ({
  conversations: [],
  activeId: null,
  loaded: false,

  load: async () => {
    try {
      const s = store();
      const conv = ((await s.get(KEY)) as Conversation[] | null) ?? [];
      const active = ((await s.get(ACTIVE_KEY)) as string | null) ?? null;
      set({ conversations: conv, activeId: active, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  newConversation: (title?: string) => {
    const id = uid();
    const now = Date.now();
    const c: Conversation = {
      id,
      title: title || 'New conversation',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ conversations: [c, ...s.conversations], activeId: id }));
    void persist(get());
    return id;
  },

  setActive: (id: string) => {
    set({ activeId: id });
    void persist(get());
  },

  appendMessage: (id: string, m: Omit<Message, 'id' | 'timestamp'>) => {
    const msg: Message = { ...m, id: uid(), timestamp: Date.now() };
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id
          ? {
              ...c,
              messages: [...c.messages, msg],
              updatedAt: Date.now(),
              title:
                c.title === 'New conversation' && m.role === 'user'
                  ? m.content.slice(0, 40)
                  : c.title,
            }
          : c,
      ),
    }));
    void persist(get());
  },

  updateLastAssistant: (id: string, content: string) => {
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== id) return c;
        const msgs = [...c.messages];
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'assistant') {
            msgs[i] = { ...msgs[i], content };
            break;
          }
        }
        return { ...c, messages: msgs, updatedAt: Date.now() };
      }),
    }));
    void persist(get());
  },

  deleteConversation: (id: string) => {
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    }));
    void persist(get());
  },

  rename: (id: string, title: string) => {
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    }));
    void persist(get());
  },
}));
