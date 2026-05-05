/**
 * Ulaa Browser — Global State (Zustand)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TabInfo {
  id: string;
  url: string;
  title: string;
  favicon: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  blockedCount: number;
  isNewTab: boolean;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon: string;
  addedAt: number;
  folder?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon: string;
  visitedAt: number;
}

export interface Download {
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  savePath: string;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  startedAt: number;
}

export interface BrowserSettings {
  homepage: string;
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'ecosia' | 'brave';
  language: 'ta' | 'en';
  adBlockEnabled: boolean;
  fingerprintProtection: boolean;
  httpsUpgrade: boolean;
  theme: 'dark' | 'light' | 'system';
  aiApiUrl: string;
  aiApiKey: string;
  aiModel: string;
  showBookmarksBar: boolean;
  tabPreview: boolean;
}

interface BrowserState {
  // Live tab state (synced from main process)
  tabs: TabInfo[];
  tabOrder: string[];
  activeTabId: string | null;
  totalBlocked: number;

  // Persisted
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  downloads: Download[];
  settings: BrowserSettings;

  // UI state
  showAISidebar: boolean;
  showSettings: boolean;
  showDownloads: boolean;
  showHistory: boolean;
  showBookmarks: boolean;
  aiTyping: boolean;

  // Actions
  setTabs: (tabs: TabInfo[]) => void;
  setTabOrder: (order: string[]) => void;
  upsertTab: (tab: TabInfo) => void;
  removeTab: (id: string) => void;
  setActiveTabId: (id: string | null) => void;
  setTotalBlocked: (n: number) => void;

  addBookmark: (entry: Omit<Bookmark, 'id' | 'addedAt'>) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (url: string) => boolean;

  addHistory: (entry: Omit<HistoryEntry, 'id' | 'visitedAt'>) => void;
  clearHistory: () => void;

  upsertDownload: (dl: Download) => void;
  clearDownloads: () => void;

  updateSettings: (partial: Partial<BrowserSettings>) => void;

  toggleAISidebar: () => void;
  setShowSettings: (v: boolean) => void;
  setShowDownloads: (v: boolean) => void;
  setShowHistory: (v: boolean) => void;
  setShowBookmarks: (v: boolean) => void;
  setAITyping: (v: boolean) => void;
}

const DEFAULT_SETTINGS: BrowserSettings = {
  homepage: 'ulaa://newtab',
  searchEngine: 'google',
  language: 'ta',
  adBlockEnabled: true,
  fingerprintProtection: true,
  httpsUpgrade: true,
  theme: 'dark',
  aiApiUrl: 'https://api.openai.com/v1',
  aiApiKey: '',
  aiModel: 'gpt-4o-mini',
  showBookmarksBar: true,
  tabPreview: true,
};

export const useBrowser = create<BrowserState>()(
  persist(
    (set, get) => ({
      tabs: [],
      tabOrder: [],
      activeTabId: null,
      totalBlocked: 0,
      bookmarks: [],
      history: [],
      downloads: [],
      settings: DEFAULT_SETTINGS,
      showAISidebar: false,
      showSettings: false,
      showDownloads: false,
      showHistory: false,
      showBookmarks: false,
      aiTyping: false,

      setTabs: (tabs) => set({ tabs }),
      setTabOrder: (tabOrder) => set({ tabOrder }),
      upsertTab: (tab) =>
        set((s) => {
          const existing = s.tabs.find((t) => t.id === tab.id);
          if (existing) {
            return { tabs: s.tabs.map((t) => (t.id === tab.id ? tab : t)) };
          }
          return { tabs: [...s.tabs, tab] };
        }),
      removeTab: (id) =>
        set((s) => ({ tabs: s.tabs.filter((t) => t.id !== id) })),
      setActiveTabId: (id) => set({ activeTabId: id }),
      setTotalBlocked: (n) => set({ totalBlocked: n }),

      addBookmark: (entry) =>
        set((s) => ({
          bookmarks: [
            { ...entry, id: `bm_${Date.now()}`, addedAt: Date.now() },
            ...s.bookmarks,
          ],
        })),
      removeBookmark: (id) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),
      isBookmarked: (url) => get().bookmarks.some((b) => b.url === url),

      addHistory: (entry) =>
        set((s) => ({
          history: [
            { ...entry, id: `h_${Date.now()}`, visitedAt: Date.now() },
            ...s.history.slice(0, 4999), // cap at 5000
          ],
        })),
      clearHistory: () => set({ history: [] }),

      upsertDownload: (dl) =>
        set((s) => {
          const existing = s.downloads.findIndex((d) => d.filename === dl.filename);
          if (existing >= 0) {
            const updated = [...s.downloads];
            updated[existing] = dl;
            return { downloads: updated };
          }
          return { downloads: [dl, ...s.downloads] };
        }),
      clearDownloads: () => set({ downloads: [] }),

      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      toggleAISidebar: () => set((s) => ({ showAISidebar: !s.showAISidebar })),
      setShowSettings: (v) => set({ showSettings: v }),
      setShowDownloads: (v) => set({ showDownloads: v }),
      setShowHistory: (v) => set({ showHistory: v }),
      setShowBookmarks: (v) => set({ showBookmarks: v }),
      setAITyping: (v) => set({ aiTyping: v }),
    }),
    {
      name: 'ulaa-browser-state',
      partialize: (s) => ({
        bookmarks: s.bookmarks,
        history: s.history,
        settings: s.settings,
      }),
    },
  ),
);

// ── Getters ────────────────────────────────────────────────────────────────────
export const getActiveTab = (): TabInfo | undefined => {
  const { tabs, activeTabId } = useBrowser.getState();
  return tabs.find((t) => t.id === activeTabId);
};
