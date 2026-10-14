import { create } from "zustand";

export interface Tab {
  id: string;
  url: string;        // displayURL
  loadURL: string;    // actual URL to load in iframe (may differ for ipfs://)
  title: string;
  favicon?: string;
  history: string[];
  historyIndex: number;
  loading: boolean;
  overlay?: "wallet" | "settings" | "bookmarks" | "history" | "home";
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  newTab: (url?: string) => string;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  navigate: (id: string, displayURL: string, loadURL: string, overlay?: Tab["overlay"]) => void;
  setTitle: (id: string, title: string) => void;
  setLoading: (id: string, loading: boolean) => void;
  back: (id: string) => void;
  forward: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}

const newId = () => Math.random().toString(36).slice(2, 10);

const blankTab = (): Tab => ({
  id: newId(),
  url: "tamizhi://home",
  loadURL: "",
  title: "New Tab",
  history: ["tamizhi://home"],
  historyIndex: 0,
  loading: false,
  overlay: "home",
});

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  newTab: (url?: string) => {
    const t = blankTab();
    if (url) {
      t.url = url;
      t.loadURL = url.startsWith("http") ? url : "";
      t.history = [url];
      t.overlay = undefined;
    }
    set((s) => ({ tabs: [...s.tabs, t], activeTabId: t.id }));
    return t.id;
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

  setActive: (id) => set({ activeTabId: id }),

  navigate: (id, displayURL, loadURL, overlay) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        const newHistory = t.history.slice(0, t.historyIndex + 1);
        newHistory.push(displayURL);
        return {
          ...t,
          url: displayURL,
          loadURL,
          overlay,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          loading: !!loadURL,
          title: displayURL,
        };
      }),
    })),

  setTitle: (id, title) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)) })),

  setLoading: (id, loading) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, loading } : t)) })),

  back: (id) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id || t.historyIndex <= 0) return t;
        const idx = t.historyIndex - 1;
        const url = t.history[idx];
        return {
          ...t,
          historyIndex: idx,
          url,
          loadURL: url.startsWith("http") ? url : "",
        };
      }),
    })),

  forward: (id) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id || t.historyIndex >= t.history.length - 1) return t;
        const idx = t.historyIndex + 1;
        const url = t.history[idx];
        return {
          ...t,
          historyIndex: idx,
          url,
          loadURL: url.startsWith("http") ? url : "",
        };
      }),
    })),

  reorder: (fromIndex, toIndex) =>
    set((s) => {
      const tabs = [...s.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { tabs };
    }),
}));

// Ensure at least one tab on startup.
if (typeof window !== "undefined") {
  setTimeout(() => {
    const s = useTabs.getState();
    if (s.tabs.length === 0) s.newTab();
  }, 0);
}
