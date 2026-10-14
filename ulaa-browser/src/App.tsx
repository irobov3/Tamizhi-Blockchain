/**
 * Ulaa Browser — Root App
 * உலா உலாவி — முக்கிய பயன்பாடு
 */

import React, { useEffect } from 'react';
import { useBrowser, TabInfo } from './store/useBrowser';
import TabBar from './components/TabBar';
import Toolbar from './components/Toolbar';
import AISidebar from './components/AISidebar';
import NewTabPage from './components/NewTabPage';
import SettingsPanel from './components/SettingsPanel';
import DownloadsPanel from './components/DownloadsPanel';
import { setLang } from './i18n';

export default function App() {
  const {
    upsertTab, removeTab, setActiveTabId, setTabOrder,
    addHistory, upsertDownload,
    tabs, activeTabId,
    showSettings, showDownloads,
    settings,
  } = useBrowser();

  // Apply language from persisted settings
  useEffect(() => {
    setLang(settings.language ?? 'ta');
  }, [settings.language]);

  // ── Wire up Electron events ───────────────────────────────────────────────
  useEffect(() => {
    if (!window.ulaa) return;

    const unsubs: Array<() => void> = [];

    // Tab created
    unsubs.push(window.ulaa.on('tab:created', (tab: TabInfo) => {
      upsertTab(tab);
    }));

    // Tab updated (url, title, loading, favicon, etc.)
    unsubs.push(window.ulaa.on('tab:updated', (tab: TabInfo) => {
      upsertTab(tab);
      // Add to history when navigation completes
      if (!tab.loading && !tab.isNewTab && tab.url && !tab.url.startsWith('data:')) {
        addHistory({ url: tab.url, title: tab.title, favicon: tab.favicon });
      }
    }));

    // Tab closed
    unsubs.push(window.ulaa.on('tab:closed', (id: string) => {
      removeTab(id);
    }));

    // Active tab changed
    unsubs.push(window.ulaa.on('tab:activated', (id: string) => {
      setActiveTabId(id);
    }));

    // Tab order changed
    unsubs.push(window.ulaa.on('tab:order', (order: string[]) => {
      setTabOrder(order);
    }));

    // Ad block count update
    unsubs.push(window.ulaa.on('adblock:count', ({ tabId, count }: { tabId: string; count: number }) => {
      const tab = useBrowser.getState().tabs.find((t) => t.id === tabId);
      if (tab) upsertTab({ ...tab, blockedCount: count });
    }));

    // Downloads
    unsubs.push(window.ulaa.on('download:started', (dl: any) => {
      upsertDownload({ ...dl, receivedBytes: 0, state: 'progressing', startedAt: Date.now() });
      useBrowser.getState().setShowDownloads(true);
    }));
    unsubs.push(window.ulaa.on('download:progress', (dl: any) => {
      const existing = useBrowser.getState().downloads.find((d) => d.filename === dl.filename);
      if (existing) upsertDownload({ ...existing, receivedBytes: dl.receivedBytes, totalBytes: dl.totalBytes });
    }));
    unsubs.push(window.ulaa.on('download:done', (dl: any) => {
      const existing = useBrowser.getState().downloads.find((d) => d.filename === dl.filename);
      if (existing) upsertDownload({ ...existing, state: dl.state === 'completed' ? 'completed' : 'interrupted' });
    }));

    // Sync initial state
    window.ulaa.getAllTabs().then((allTabs: TabInfo[]) => {
      allTabs.forEach((t) => upsertTab(t));
    });
    window.ulaa.getActiveTab().then((id: string | null) => {
      if (id) setActiveTabId(id);
    });

    return () => unsubs.forEach((fn) => fn());
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const showNewTab = !activeTab || activeTab.isNewTab;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Chrome (TabBar + Toolbar) ── */}
      <div style={{ flexShrink: 0, zIndex: 10 }}>
        <TabBar />
        <Toolbar />
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* New tab page (rendered in renderer when BrowserView is hidden) */}
        {showNewTab && <NewTabPage />}

        {/* When BrowserView is active, this area is covered by the Electron BrowserView */}
        {/* We render a placeholder so the layout stays correct */}
        {!showNewTab && (
          <div style={{ flex: 1, background: 'var(--bg)' }} />
        )}

        {/* AI Sidebar */}
        <AISidebar />
      </div>

      {/* ── Overlays ── */}
      {showSettings  && <SettingsPanel />}
      {showDownloads && <DownloadsPanel />}
    </div>
  );
}
