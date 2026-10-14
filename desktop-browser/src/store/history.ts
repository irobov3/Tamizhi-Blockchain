import { create } from "zustand";
import { loadKey, saveKey } from "./persist";

export interface HistoryEntry {
  url: string;
  title: string;
  visitedAt: number;
}

const KEY = "history/v1";
const MAX = 10_000;

interface State {
  items: HistoryEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  push: (e: HistoryEntry) => void;
  clear: () => void;
}

export const useHistory = create<State>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    const items = await loadKey<HistoryEntry[]>(KEY, []);
    set({ items, hydrated: true });
  },
  push: (e) => {
    const items = [e, ...get().items].slice(0, MAX);
    set({ items });
    void saveKey(KEY, items);
  },
  clear: () => {
    set({ items: [] });
    void saveKey(KEY, []);
  },
}));
