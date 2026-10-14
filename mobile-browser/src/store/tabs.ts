import { create } from 'zustand';

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  thumbnail?: string;
  history: string[];
  historyIndex: number;
  loading: boolean;
}

interface TabsState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  newTab: (url?: string) => string;
  closeTab: (id: string) => void;
  closeAll: () => void;
  setActiveTab: (id: string) => void;
  navigate: (id: string, url: string) => void;
  setTitle: (id: string, title: string) => void;
  setFavicon: (id: string, favicon: string) => void;
  setThumbnail: (id: string, dataUri: string) => void;
  setLoading: (id: string, loading: boolean) => void;
  goBack: (id: string) => void;
  goForward: (id: string) => void;
  getActiveTab: () => BrowserTab | null;
}

const HOME = 'tamizhi://home';

const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  newTab: (url = HOME) => {
    const id = newId();
    const tab: BrowserTab = {
      id,
      url,
      title: 'New Tab',
      history: [url],
      historyIndex: 0,
      loading: false,
    };
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: id }));
    return id;
  },

  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      let activeTabId = s.activeTabId;
      if (activeTabId === id) {
        activeTabId = tabs.length ? tabs[tabs.length - 1].id : null;
      }
      return { tabs, activeTabId };
    }),

  closeAll: () => set({ tabs: [], activeTabId: null }),

  setActiveTab: (id) => set({ activeTabId: id }),

  navigate: (id, url) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        const trimmedHistory = t.history.slice(0, t.historyIndex + 1);
        const history = [...trimmedHistory, url];
        return {
          ...t,
          url,
          history,
          historyIndex: history.length - 1,
          loading: true,
        };
      }),
    })),

  setTitle: (id, title) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    })),

  setFavicon: (id, favicon) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, favicon } : t)),
    })),

  setThumbnail: (id, thumbnail) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, thumbnail } : t)),
    })),

  setLoading: (id, loading) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, loading } : t)),
    })),

  goBack: (id) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        if (t.historyIndex <= 0) return t;
        const idx = t.historyIndex - 1;
        return { ...t, historyIndex: idx, url: t.history[idx] };
      }),
    })),

  goForward: (id) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        if (t.historyIndex >= t.history.length - 1) return t;
        const idx = t.historyIndex + 1;
        return { ...t, historyIndex: idx, url: t.history[idx] };
      }),
    })),

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return null;
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },
}));
