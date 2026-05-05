import React, { useState, useEffect, useRef } from 'react';
import { useBrowser } from '../store/useBrowser';
import { t, tArr } from '../i18n';

const QUICK_LINKS = [
  { label: 'Google',    url: 'https://google.com',    emoji: '🔍' },
  { label: 'YouTube',   url: 'https://youtube.com',   emoji: '▶️' },
  { label: 'Wikipedia', url: 'https://wikipedia.org', emoji: '📖' },
  { label: 'GitHub',    url: 'https://github.com',    emoji: '💻' },
  { label: 'Twitter',   url: 'https://twitter.com',   emoji: '🐦' },
  { label: 'Reddit',    url: 'https://reddit.com',    emoji: '🔴' },
  { label: 'தமிழ் Wiki',url: 'https://ta.wikipedia.org', emoji: '🌐' },
  { label: 'Dinakaran', url: 'https://www.dinakaran.com', emoji: '📰' },
];

const SEARCH_ENGINES: Record<string, { url: string; label: string }> = {
  google:     { url: 'https://www.google.com/search?q=',     label: 'Google' },
  bing:       { url: 'https://www.bing.com/search?q=',       label: 'Bing' },
  duckduckgo: { url: 'https://duckduckgo.com/?q=',           label: 'DuckDuckGo' },
  ecosia:     { url: 'https://www.ecosia.org/search?q=',     label: 'Ecosia' },
  brave:      { url: 'https://search.brave.com/search?q=',   label: 'Brave Search' },
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return t('greetMorning');
  if (h < 17) return t('greetAfternoon');
  if (h < 21) return t('greetEvening');
  return t('greetNight');
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ textAlign: 'center', marginBottom: 8 }}>
      <div style={{ fontSize: 64, fontWeight: 200, color: 'var(--text)', letterSpacing: -2, lineHeight: 1 }}>
        {time.toLocaleTimeString('ta-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>
        {time.toLocaleDateString('ta-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}

export default function NewTabPage() {
  const { tabs, activeTabId, settings, totalBlocked, history } = useBrowser();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const todayBlocked = totalBlocked;

  // Random Tamil quote
  const quotes = tArr('quotes');
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  // Most visited from history (top 4)
  const topSites = React.useMemo(() => {
    const counts: Record<string, { url: string; title: string; favicon: string; count: number }> = {};
    for (const h of history) {
      const key = h.url;
      if (!counts[key]) counts[key] = { url: h.url, title: h.title, favicon: h.favicon, count: 0 };
      counts[key].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [history]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  function doSearch() {
    if (!query.trim() || !activeTabId) return;
    const engine = SEARCH_ENGINES[settings.searchEngine] ?? SEARCH_ENGINES.google;
    const url = /^https?:\/\//.test(query) ? query : (
      /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(query.trim()) ? `https://${query.trim()}` :
      `${engine.url}${encodeURIComponent(query)}`
    );
    window.ulaa.navigate(activeTabId, url);
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'auto', padding: 24,
      gap: 0,
    }}>
      {/* Background particles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 200 + 80,
            height: Math.random() * 200 + 80,
            borderRadius: '50%',
            background: i % 2 === 0 ? 'var(--primary)' : 'var(--ai)',
            opacity: 0.025,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            transform: 'translate(-50%,-50%)',
            filter: 'blur(40px)',
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>

        {/* Logo + Greeting */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--primary), #FF9A5C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(255,107,43,0.3)',
            fontSize: 28,
          }}>
            உ
          </div>
          <div style={{ fontSize: 22, color: 'var(--text2)', fontWeight: 300 }}>{getGreeting()}</div>
        </div>

        {/* Clock */}
        <Clock />

        {/* Search bar */}
        <div style={{ width: '100%' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
            transition: 'border-color 0.2s',
          }}
          onFocus={() => {}}
          >
            <span style={{ padding: '0 14px', color: 'var(--text3)', fontSize: 16, flexShrink: 0 }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder={t('searchHint')}
              style={{
                flex: 1, height: 52, fontSize: 16,
                color: 'var(--text)', background: 'transparent',
              }}
            />
            <button
              onClick={doSearch}
              style={{
                height: 52, padding: '0 20px',
                background: 'var(--primary)',
                color: '#fff', fontWeight: 700, fontSize: 14,
                borderLeft: '1px solid var(--border)',
                transition: 'opacity 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {t('search')}
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
            {SEARCH_ENGINES[settings.searchEngine]?.label ?? 'Google'} · {t('searchEngine')}
          </div>
        </div>

        {/* Quick links + Top sites */}
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('quickLinks')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {(topSites.length > 0 ? topSites.map((s) => ({ label: s.title.slice(0, 12), url: s.url, emoji: '🌐' })) : QUICK_LINKS.slice(0, 4))
              .concat(QUICK_LINKS.slice(0, 4))
              .slice(0, 8)
              .map((link) => (
                <button
                  key={link.url}
                  onClick={() => activeTabId && window.ulaa.navigate(activeTabId, link.url)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 8px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: 20 }}>{link.emoji}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                    {link.label}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Privacy stats */}
        <div style={{
          width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        }}>
          {[
            { label: t('adsBlocked'),      value: todayBlocked.toLocaleString('ta'), color: 'var(--primary)', icon: '🛡️' },
            { label: t('trackersBlocked'), value: Math.floor(todayBlocked * 1.4).toLocaleString('ta'), color: 'var(--ai)', icon: '👁️' },
            { label: t('timeSaved'),       value: `~${Math.floor(todayBlocked * 0.05)} நொடி`, color: 'var(--success)', icon: '⏱️' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '16px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tamil quote */}
        {quote && (
          <div style={{
            padding: '14px 20px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)',
            borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text2)',
            fontStyle: 'italic', textAlign: 'center', width: '100%',
          }}>
            {quote}
          </div>
        )}
      </div>
    </div>
  );
}
