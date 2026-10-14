import { create } from 'zustand';

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BrowserStore {
  tabs: BrowserTab[];
  activeTabId: string | null;
  addTab: (url?: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<BrowserTab>) => void;
  activeTab: () => BrowserTab | null;
}

const NEW_TAB_URL = 'tamizhi://newtab';

const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useBrowserStore = create<BrowserStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (url = NEW_TAB_URL) => {
    const id = newId();
    const tab: BrowserTab = {
      id,
      url,
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
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

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTab: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  activeTab: () => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return null;
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },
}));
