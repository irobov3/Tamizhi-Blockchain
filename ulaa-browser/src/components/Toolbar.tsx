import React, { useState, useRef, useEffect } from 'react';
import { useBrowser } from '../store/useBrowser';
import { t } from '../i18n';

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
const Icon = {
  Back: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  Forward: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  Reload: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Stop: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Home: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Shield: (active: boolean) => <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Star: (filled: boolean) => <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  AI: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4M4 20v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/><circle cx="12" cy="8" r="1" fill="currentColor"/></svg>,
  Lock: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Globe: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Menu: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  History: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

function NavBtn({ onClick, disabled, title, children }: {
  onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        color: disabled ? 'var(--text3)' : 'var(--text2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.1s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

export default function Toolbar() {
  const {
    tabs, activeTabId,
    showAISidebar, toggleAISidebar,
    showSettings, setShowSettings,
    showDownloads, setShowDownloads,
    showHistory, setShowHistory,
    addBookmark, removeBookmark, isBookmarked,
    settings,
  } = useBrowser();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [inputUrl, setInputUrl] = useState('');
  const [focused, setFocused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = focused ? inputUrl : (activeTab?.isNewTab ? '' : (activeTab?.url ?? ''));
  const isHttps = activeTab?.url?.startsWith('https://');
  const blocked = activeTab ? (activeTab.blockedCount ?? 0) : 0;
  const bookmarked = activeTab ? isBookmarked(activeTab.url) : false;

  // Sync address bar with active tab URL
  useEffect(() => {
    if (!focused) {
      setInputUrl(activeTab?.isNewTab ? '' : (activeTab?.url ?? ''));
    }
  }, [activeTab?.url, activeTab?.isNewTab, focused]);

  function handleNavigate(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && activeTabId) {
      window.ulaa.navigate(activeTabId, inputUrl);
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setInputUrl(activeTab?.isNewTab ? '' : (activeTab?.url ?? ''));
      (e.target as HTMLInputElement).blur();
    }
  }

  function toggleBookmark() {
    if (!activeTab || activeTab.isNewTab) return;
    if (bookmarked) {
      const { bookmarks } = useBrowser.getState();
      const bm = bookmarks.find((b) => b.url === activeTab.url);
      if (bm) useBrowser.getState().removeBookmark(bm.id);
    } else {
      addBookmark({ url: activeTab.url, title: activeTab.title, favicon: activeTab.favicon });
    }
  }

  const menuItems = [
    { label: t('newTab'),      action: () => window.ulaa.createTab() },
    { label: t('bookmarks'),   action: () => useBrowser.getState().setShowBookmarks(true) },
    { label: t('history'),     action: () => setShowHistory(!showHistory) },
    { label: t('downloads'),   action: () => setShowDownloads(!showDownloads) },
    { label: '---' },
    { label: t('settings'),    action: () => setShowSettings(!showSettings) },
  ];

  return (
    <div style={{
      height: 'var(--toolbar-h)',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      gap: 4,
      flexShrink: 0,
    }}>
      {/* Nav buttons */}
      <NavBtn onClick={() => window.ulaa.goBack()} disabled={!activeTab?.canGoBack} title={t('back')}>
        <Icon.Back />
      </NavBtn>
      <NavBtn onClick={() => window.ulaa.goForward()} disabled={!activeTab?.canGoForward} title={t('forward')}>
        <Icon.Forward />
      </NavBtn>
      <NavBtn
        onClick={() => activeTab?.loading ? window.ulaa.stop() : window.ulaa.reload()}
        title={activeTab?.loading ? t('stop') : t('reload')}
      >
        {activeTab?.loading ? <Icon.Stop /> : <Icon.Reload />}
      </NavBtn>
      <NavBtn onClick={() => window.ulaa.createTab()} title={t('home')}>
        <Icon.Home />
      </NavBtn>

      {/* Address bar */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        background: focused ? 'var(--surface2)' : 'var(--bg)',
        border: `1px solid ${focused ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '0 10px',
        height: 34,
        gap: 6,
        transition: 'all 0.15s',
      }}>
        {/* Security icon */}
        {!focused && activeTab && !activeTab.isNewTab && (
          <span style={{ color: isHttps ? 'var(--success)' : 'var(--text3)', flexShrink: 0 }}>
            {isHttps ? <Icon.Lock /> : <Icon.Globe />}
          </span>
        )}
        <input
          ref={inputRef}
          value={focused ? inputUrl : displayUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            setInputUrl(activeTab?.isNewTab ? '' : (activeTab?.url ?? ''));
            e.target.select();
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleNavigate}
          placeholder={focused ? t('addressBar') : (activeTab?.isNewTab ? t('addressBar') : '')}
          style={{
            flex: 1,
            fontSize: 13,
            color: 'var(--text)',
            background: 'transparent',
            minWidth: 0,
          }}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
        {/* Shield + blocked count */}
        {!focused && settings.adBlockEnabled && blocked > 0 && (
          <span style={{
            fontSize: 10, color: 'var(--primary)', background: 'var(--primary-dim)',
            padding: '1px 5px', borderRadius: 4, fontWeight: 700, flexShrink: 0,
          }}>
            -{blocked}
          </span>
        )}
      </div>

      {/* Bookmark */}
      <NavBtn onClick={toggleBookmark} title={bookmarked ? t('removeBookmark') : t('addBookmark')}>
        <span style={{ color: bookmarked ? '#FFD166' : 'var(--text2)' }}>
          <Icon.Star filled={bookmarked} />
        </span>
      </NavBtn>

      {/* Shield */}
      <NavBtn
        onClick={() => useBrowser.getState().updateSettings({ adBlockEnabled: !settings.adBlockEnabled })}
        title={settings.adBlockEnabled ? t('shieldOn') : t('shieldOff')}
      >
        <span style={{ color: settings.adBlockEnabled ? 'var(--primary)' : 'var(--text3)' }}>
          <Icon.Shield active={settings.adBlockEnabled} />
        </span>
      </NavBtn>

      {/* AI sidebar toggle */}
      <NavBtn onClick={toggleAISidebar} title={t('aiTitle')}>
        <span style={{ color: showAISidebar ? 'var(--ai)' : 'var(--text2)' }}>
          <Icon.AI />
        </span>
      </NavBtn>

      {/* Downloads */}
      <NavBtn onClick={() => setShowDownloads(!showDownloads)} title={t('downloads')}>
        <span style={{ color: showDownloads ? 'var(--primary)' : 'var(--text2)' }}>
          <Icon.Download />
        </span>
      </NavBtn>

      {/* Hamburger menu */}
      <div style={{ position: 'relative' }}>
        <NavBtn onClick={() => setShowMenu((v) => !v)} title="Menu">
          <Icon.Menu />
        </NavBtn>
        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            <div style={{
              position: 'absolute', top: '110%', right: 0,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 6, zIndex: 100,
              minWidth: 180, boxShadow: 'var(--shadow)',
            }}>
              {menuItems.map((item, i) =>
                item.label === '---' ? (
                  <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                ) : (
                  <button
                    key={item.label}
                    onClick={() => { item.action?.(); setShowMenu(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', borderRadius: 6, fontSize: 13,
                      color: 'var(--text)', transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
