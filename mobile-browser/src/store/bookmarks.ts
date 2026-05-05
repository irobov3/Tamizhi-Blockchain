import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'tamizhi.browser.bookmarks.v1';

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  folderId: string;
  createdAt: number;
}

export interface BookmarkFolder {
  id: string;
  name: string;
}

interface BookmarksState {
  folders: BookmarkFolder[];
  bookmarks: Bookmark[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addFolder: (name: string) => string;
  deleteFolder: (id: string) => void;
  add: (b: Omit<Bookmark, 'id' | 'createdAt'>) => string;
  update: (id: string, patch: Partial<Bookmark>) => void;
  remove: (id: string) => void;
}

const DEFAULT_FOLDERS: BookmarkFolder[] = [
  { id: 'tamizhi', name: 'Tamizhi' },
  { id: 'crypto', name: 'Crypto' },
  { id: 'other', name: 'Other' },
];

const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

async function persist(state: Pick<BookmarksState, 'folders' | 'bookmarks'>) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('bookmarks persist failed', e);
  }
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
  folders: DEFAULT_FOLDERS,
  bookmarks: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          folders: parsed.folders ?? DEFAULT_FOLDERS,
          bookmarks: parsed.bookmarks ?? [],
          hydrated: true,
        });
        return;
      }
    } catch (e) {
      console.warn('bookmarks hydrate failed', e);
    }
    set({ hydrated: true });
  },

  addFolder: (name) => {
    const id = newId();
    const folder = { id, name };
    set((s) => {
      const next = { folders: [...s.folders, folder], bookmarks: s.bookmarks };
      persist(next);
      return next;
    });
    return id;
  },

  deleteFolder: (id) =>
    set((s) => {
      const folders = s.folders.filter((f) => f.id !== id);
      const bookmarks = s.bookmarks.filter((b) => b.folderId !== id);
      const next = { folders, bookmarks };
      persist(next);
      return next;
    }),

  add: (b) => {
    const id = newId();
    const bookmark: Bookmark = { ...b, id, createdAt: Date.now() };
    set((s) => {
      const next = { folders: s.folders, bookmarks: [...s.bookmarks, bookmark] };
      persist(next);
      return next;
    });
    return id;
  },

  update: (id, patch) =>
    set((s) => {
      const bookmarks = s.bookmarks.map((b) =>
        b.id === id ? { ...b, ...patch } : b
      );
      const next = { folders: s.folders, bookmarks };
      persist(next);
      return next;
    }),

  remove: (id) =>
    set((s) => {
      const bookmarks = s.bookmarks.filter((b) => b.id !== id);
      const next = { folders: s.folders, bookmarks };
      persist(next);
      return next;
    }),
}));
