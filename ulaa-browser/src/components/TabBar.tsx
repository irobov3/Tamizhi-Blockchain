import React, { useEffect } from 'react';
import { useBrowser, TabInfo } from '../store/useBrowser';
import { t } from '../i18n';

const C = {
  bar: {
    height: 'var(--tab-h)',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: process.platform === 'darwin' ? 80 : 12,
    paddingRight: 8,
    gap: 2,
    WebkitAppRegion: 'drag',
    overflow: 'hidden',
    flexShrink: 0,
    borderBottom: '1px solid var(--border)',
  } as React.CSSProperties,
  tabsScroll: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    overflow: 'hidden',
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
    maxWidth: 200,
    height: 30,
    borderRadius: 'var(--radius-sm)',
    padding: '0 8px 0 10px',
    background: active ? 'var(--surface)' : 'transparent',
    border: active ? '1px solid var(--border)' : '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.1s',
    flexShrink: 1,
    WebkitAppRegion: 'no-drag',
    position: 'relative',
  }),
  favicon: { width: 14, height: 14, borderRadius: 2, flexShrink: 0 } as React.CSSProperties,
  tabTitle: {
    flex: 1,
    fontSize: 11,
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  closeBtn: (hovered: boolean): React.CSSProperties => ({
    width: 16,
    height: 16,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: hovered ? 'rgba(255,255,255,0.12)' : 'transparent',
    flexShrink: 0,
    fontSize: 11,
    color: 'var(--text2)',
    transition: 'background 0.1s',
  }),
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text2)',
    flexShrink: 0,
    WebkitAppRegion: 'no-drag',
    fontSize: 18,
    transition: 'color 0.1s, background 0.1s',
  } as React.CSSProperties,
  // Window controls (Windows/Linux)
  winControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    marginLeft: 8,
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties,
};

function FaviconOrInitial({ favicon, title }: { favicon: string; title: string }) {
  if (favicon) {
    return <img src={favicon} style={C.favicon} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />;
  }
  return (
    <div style={{ ...C.favicon, background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--primary)', fontWeight: 700 }}>
      {(title?.[0] ?? '?').toUpperCase()}
    </div>
  );
}

function TabItem({ tab, isActive }: { tab: TabInfo; isActive: boolean }) {
  const [closeHovered, setCloseHovered] = React.useState(false);

  return (
    <div
      style={C.tab(isActive)}
      onClick={() => window.ulaa.switchTab(tab.id)}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
      title={tab.title}
    >
      {tab.loading ? (
        <div style={{ width: 14, height: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner size={12} />
        </div>
      ) : (
        <FaviconOrInitial favicon={tab.favicon} title={tab.title} />
      )}
      <span style={C.tabTitle}>{tab.isNewTab ? t('newTab') : (tab.title || t('newTab'))}</span>
      <button
        style={C.closeBtn(closeHovered)}
        onMouseEnter={() => setCloseHovered(true)}
        onMouseLeave={() => setCloseHovered(false)}
        onClick={(e) => { e.stopPropagation(); window.ulaa.closeTab(tab.id); }}
        title={t('closeTab')}
      >
        ×
      </button>
    </div>
  );
}

function LoadingSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="30 60" />
    </svg>
  );
}

export default function TabBar() {
  const { tabs, tabOrder, activeTabId } = useBrowser();
  const orderedTabs = tabOrder.map((id) => tabs.find((t) => t.id === id)).filter(Boolean) as TabInfo[];
  const isMac = process.platform === 'darwin';

  return (
    <div style={C.bar}>
      <div style={C.tabsScroll}>
        {orderedTabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
        ))}
        <button
          style={C.addBtn}
          onClick={() => window.ulaa.createTab()}
          title={t('newTab')}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text2)'; }}
        >
          +
        </button>
      </div>

      {/* Window controls for Windows/Linux */}
      {!isMac && (
        <div style={C.winControls}>
          {[
            { action: 'minimize', label: '─', color: '#FFD166' },
            { action: 'maximize', label: '□', color: '#2DD4BF' },
            { action: 'close',    label: '×', color: '#FF4757' },
          ].map(({ action, label, color }) => (
            <button
              key={action}
              onClick={() => {
                if (action === 'minimize') window.ulaa.minimize();
                else if (action === 'maximize') window.ulaa.maximize();
                else window.ulaa.closeWin();
              }}
              style={{
                width: 32, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text2)', fontSize: 14,
                transition: 'background 0.1s, color 0.1s',
                WebkitAppRegion: 'no-drag',
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = color + '25';
                (e.currentTarget as HTMLElement).style.color = color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--text2)';
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
