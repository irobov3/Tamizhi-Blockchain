'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchWorks } from '@/lib/api';
import type { WorkSearchResult } from '@/lib/types';
import SearchBar from '@/components/SearchBar';
import WorkBadge from '@/components/WorkBadge';
import VerifiedBadge from '@/components/VerifiedBadge';

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        style={{
          background: '#fde68a',
          color: '#92400e',
          borderRadius: '2px',
          padding: '0 1px',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchWorks(query).then((r) => {
      if (!cancelled) {
        setResults(r);
        setLoading(false);
        setSearched(true);
      }
    }).catch(() => {
      if (!cancelled) { setLoading(false); setSearched(true); }
    });

    return () => { cancelled = true; };
  }, [query]);

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 64px' }}>
      {/* Page heading */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#2d1b00',
            marginBottom: '8px',
          }}
        >
          Search Literary Works
        </h1>
        <p style={{ color: '#7a6545', fontSize: '15px' }}>
          Search by title, author, or transliteration across all works indexed on Tamizhi.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: '40px' }}>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search by title, author, era…"
          debounceMs={300}
          autoFocus
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#9b8469' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          Searching…
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length > 0 && (
        <div>
          <p style={{ fontSize: '13px', color: '#9b8469', marginBottom: '20px' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((r) => (
              <Link
                key={r.work_id}
                href={`/works/${r.work_id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <article
                  style={{
                    background: '#fff',
                    border: '1px solid #e8e0d0',
                    borderRadius: '10px',
                    padding: '18px 20px',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(192,57,43,0.1)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#c0392b';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = '#e8e0d0';
                  }}
                >
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <WorkBadge type={r.work_type} size="sm" />
                    {r.verified && <VerifiedBadge size="sm" />}
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontSize: '17px',
                      fontFamily: 'Noto Sans Tamil, serif',
                      color: '#2d1b00',
                      margin: '0 0 4px',
                    }}
                  >
                    {highlight(r.title, query)}
                  </h2>

                  {r.title_transliteration && (
                    <p style={{ fontSize: '13px', color: '#7a6545', fontStyle: 'italic', margin: '0 0 8px' }}>
                      {highlight(r.title_transliteration, query)}
                    </p>
                  )}

                  {/* Author + language row */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#7a6545' }}>
                    <span>by <strong style={{ color: '#4a3520' }}>{highlight(r.author, query)}</strong></span>
                    <span style={{ color: '#c8b89a' }}>·</span>
                    <span>{r.language}</span>
                  </div>

                  {/* Snippet */}
                  {r.snippet && (
                    <p
                      style={{
                        marginTop: '10px',
                        fontSize: '13px',
                        color: '#6b5a3e',
                        borderLeft: '3px solid #f39c12',
                        paddingLeft: '12px',
                        fontStyle: 'italic',
                      }}
                    >
                      {highlight(r.snippet, query)}
                    </p>
                  )}
                </article>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            background: '#fff',
            border: '1px solid #e8e0d0',
            borderRadius: '12px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h2 style={{ fontSize: '20px', color: '#2d1b00', marginBottom: '8px' }}>
            No results for &ldquo;{query}&rdquo;
          </h2>
          <p style={{ color: '#7a6545', fontSize: '15px', marginBottom: '24px' }}>
            This work may not yet be in the index. Consider submitting it to preserve it
            on the Tamizhi blockchain.
          </p>
          <Link
            href="/submit"
            style={{
              display: 'inline-block',
              background: '#c0392b',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '15px',
            }}
          >
            Submit this work →
          </Link>
        </div>
      )}

      {/* Empty state (no query yet) */}
      {!loading && !searched && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#9b8469',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <p style={{ fontSize: '15px' }}>
            Start typing to search across all indexed Tamil literary works.
          </p>
        </div>
      )}
    </div>
  );
}
