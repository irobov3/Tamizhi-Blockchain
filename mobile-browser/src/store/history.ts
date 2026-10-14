import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'tamizhi.browser.history.v1';
const MAX = 10000;

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (url: string, title: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  search: (q: string) => HistoryEntry[];
}

const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

async function persist(entries: HistoryEntry[]) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('history persist failed', e);
  }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        set({ entries: JSON.parse(raw), hydrated: true });
        return;
      }
    } catch (e) {
      console.warn('history hydrate failed', e);
    }
    set({ hydrated: true });
  },

  add: (url, title) => {
    if (!url || url.startsWith('tamizhi://home')) return;
    const entry: HistoryEntry = {
      id: newId(),
      url,
      title,
      visitedAt: Date.now(),
    };
    set((s) => {
      const entries = [entry, ...s.entries].slice(0, MAX);
      persist(entries);
      return { entries };
    });
  },

  remove: (id) =>
    set((s) => {
      const entries = s.entries.filter((e) => e.id !== id);
      persist(entries);
      return { entries };
    }),

  clear: () => {
    persist([]);
    set({ entries: [] });
  },

  search: (q) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return get().entries;
    return get().entries.filter(
      (e) =>
        e.url.toLowerCase().includes(needle) ||
        e.title.toLowerCase().includes(needle)
    );
  },
}));
