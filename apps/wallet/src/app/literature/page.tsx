'use client';

import React, { useEffect, useState } from 'react';
import { getLiteratureWorks, type LiteratureWork } from '@/lib/api';

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return ts;
  }
}

export default function LiteraturePage() {
  const [works, setWorks] = useState<LiteratureWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getLiteratureWorks();
        setWorks(data);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load literary works.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = works.filter(
    (w) =>
      !search ||
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.author.toLowerCase().includes(search.toLowerCase()) ||
      w.era.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.h1}>
          <span style={styles.tamilAccent}>இலக்கியம்</span> Literary Works
        </h1>
        <p style={styles.subtitle}>
          Tamil literary heritage preserved on the Tamizhi blockchain.
        </p>
      </div>

      {/* Search */}
      <div style={styles.searchRow}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search by title, author, or era…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button style={styles.clearBtn} onClick={() => setSearch('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>
        <div style={styles.countBadge}>
          {loading ? '…' : `${filtered.length} work${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={styles.skeletonCard} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          {search ? `No works matching "${search}".` : 'No literary works found.'}
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((work) => (
            <div key={work.id} style={styles.workCard}>
              <div style={styles.workHeader}>
                <h3 style={styles.workTitle}>{work.title}</h3>
                <span style={styles.eraBadge}>{work.era}</span>
              </div>
              <div style={styles.workAuthor}>by {work.author}</div>
              <div style={styles.workMeta}>
                <span style={styles.metaItem}>
                  <span style={styles.metaIcon}>📖</span>
                  {work.lines.toLocaleString()} lines
                </span>
                <span style={styles.metaItem}>
                  <span style={styles.metaIcon}>📅</span>
                  {formatTimestamp(work.registered_at)}
                </span>
              </div>
              <div style={styles.hashRow}>
                <span style={styles.hashLabel}>On-chain hash</span>
                <code style={styles.hash}>{work.hash.slice(0, 24)}…</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: '24px' },
  h1: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#fdf6e3',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  tamilAccent: {
    fontFamily: 'var(--font-noto-tamil), sans-serif',
    color: '#f5a623',
    fontSize: '22px',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '14px',
    color: 'rgba(253,246,227,0.5)',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: '240px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '15px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 40px 10px 38px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(245,166,35,0.2)',
    borderRadius: '8px',
    color: '#fdf6e3',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'rgba(253,246,227,0.4)',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 4px',
    fontFamily: 'inherit',
  },
  countBadge: {
    fontSize: '13px',
    color: 'rgba(253,246,227,0.5)',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    background: 'rgba(239,83,80,0.1)',
    border: '1px solid rgba(239,83,80,0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ef5350',
    fontSize: '14px',
    marginBottom: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '18px',
  },
  skeletonCard: {
    height: '170px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: 'rgba(253,246,227,0.4)',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px dashed rgba(245,166,35,0.15)',
    fontSize: '14px',
  },
  workCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(245,166,35,0.15)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: 'border-color 0.2s',
  },
  workHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  workTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#fdf6e3',
    lineHeight: 1.3,
    fontFamily: 'var(--font-noto-tamil), var(--font-inter), sans-serif',
  },
  eraBadge: {
    flexShrink: 0,
    fontSize: '11px',
    fontWeight: 600,
    color: '#f5a623',
    background: 'rgba(245,166,35,0.12)',
    border: '1px solid rgba(245,166,35,0.25)',
    padding: '2px 8px',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
  },
  workAuthor: {
    fontSize: '13px',
    color: 'rgba(253,246,227,0.6)',
    fontStyle: 'italic',
  },
  workMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: 'rgba(253,246,227,0.5)',
  },
  metaIcon: {
    fontSize: '13px',
  },
  hashRow: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  hashLabel: {
    fontSize: '11px',
    color: 'rgba(253,246,227,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  hash: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: 'rgba(253,246,227,0.5)',
    wordBreak: 'break-all',
  },
};
