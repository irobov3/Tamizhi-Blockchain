import { create } from "zustand";
import { loadKey, saveKey } from "./persist";

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folder: string; // "/" for root
  createdAt: number;
}

interface State {
  items: Bookmark[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (b: Omit<Bookmark, "id" | "createdAt">) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<Bookmark>) => void;
}

const KEY = "bookmarks/v1";

export const useBookmarks = create<State>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    const items = await loadKey<Bookmark[]>(KEY, []);
    set({ items, hydrated: true });
  },
  add: (b) => {
    const item: Bookmark = {
      id: Math.random().toString(36).slice(2),
      createdAt: Date.now(),
      ...b,
    };
    const items = [...get().items, item];
    set({ items });
    void saveKey(KEY, items);
  },
  remove: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    set({ items });
    void saveKey(KEY, items);
  },
  update: (id, patch) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    set({ items });
    void saveKey(KEY, items);
  },
}));
