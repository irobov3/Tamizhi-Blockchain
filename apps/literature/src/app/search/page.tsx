'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { searchWorks } from '@/lib/api'
import type { LiteratureWork } from '@/lib/types'
import SearchBar from '@/components/SearchBar'
import VerifiedBadge from '@/components/VerifiedBadge'
import { formatGenre, genreColor } from '@/lib/format'

type SearchField = 'title' | 'author' | 'content'

const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: 'title',   label: 'Title' },
  { value: 'author',  label: 'Author' },
  { value: 'content', label: 'Content' },
]

const RECENT_KEY = 'tamizhi_recent_searches'

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentSearch(q: string) {
  if (!q.trim()) return
  try {
    const existing = getRecentSearches()
    const updated = [q, ...existing.filter((s) => s !== q)].slice(0, 8)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} style={{
        background: 'rgba(212,160,23,0.25)',
        color: '#d4a017',
        borderRadius: '2px',
        padding: '0 2px',
      }}>
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchField, setSearchField] = useState<SearchField>('title')
  const [results, setResults] = useState<LiteratureWork[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    searchWorks(q)
      .then((r) => {
        setResults(r)
        setLoading(false)
        setSearched(true)
        saveRecentSearch(q)
        setRecentSearches(getRecentSearches())
      })
      .catch(() => {
        setLoading(false)
        setSearched(true)
      })
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  function handleRecentClick(q: string) {
    setQuery(q)
    doSearch(q)
  }

  function clearRecent() {
    try {
      localStorage.removeItem(RECENT_KEY)
      setRecentSearches([])
    } catch { /* ignore */ }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '56px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'Noto Sans Tamil, serif',
          fontSize: '16px',
          color: '#d4a017',
          marginBottom: '12px',
        }}>
          தேடுக
        </p>
        <h1 style={{
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 700,
          color: '#fdf6e3',
          marginBottom: '10px',
          letterSpacing: '-0.01em',
        }}>
          Search Tamil Literature
        </h1>
        <p style={{ color: '#8a8aa0', fontSize: '15px' }}>
          Search by title, author, or content across all works indexed on Tamizhi.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: '16px' }}>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={`Search by ${searchField}… (e.g. திருக்குறள், Thiruvalluvar)`}
          debounceMs={0}
          autoFocus
          large
        />
      </div>

      {/* Search field toggle */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '40px',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '13px', color: '#8a8aa0' }}>Search by:</span>
        {SEARCH_FIELDS.map((f) => (
          <button
            key={f.value}
            onClick={() => setSearchField(f.value)}
            style={{
              padding: '5px 14px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: searchField === f.value ? '#d4a017' : '#2a1f5c',
              background: searchField === f.value ? 'rgba(212,160,23,0.12)' : 'transparent',
              color: searchField === f.value ? '#d4a017' : '#8a8aa0',
              fontSize: '13px',
              fontWeight: searchField === f.value ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8a8aa0' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid #2a1f5c',
            borderTopColor: '#d4a017',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          Searching…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length > 0 && (
        <div>
          <p style={{ fontSize: '13px', color: '#8a8aa0', marginBottom: '20px' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
            <span style={{ color: '#d4a017' }}>&ldquo;{query}&rdquo;</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((r) => {
              const color = genreColor(r.genre)
              return (
                <Link
                  key={r.id}
                  href={`/works/${r.id}`}
                  style={{ display: 'block', textDecoration: 'none' }}
                >
                  <article
                    style={{
                      background: '#1a1040',
                      border: '1px solid #2a1f5c',
                      borderLeft: `4px solid ${color}`,
                      borderRadius: '12px',
                      padding: '20px 22px',
                      transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.transform = 'translateX(4px)'
                      el.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3)`
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.transform = 'translateX(0)'
                      el.style.boxShadow = 'none'
                    }}
                  >
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        background: `${color}15`,
                        border: `1px solid ${color}35`,
                        color,
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                      }}>
                        {formatGenre(r.genre)}
                      </span>
                      {r.verified && <VerifiedBadge size="sm" />}
                    </div>

                    {/* Tamil title */}
                    {r.titleTamil && (
                      <div style={{
                        fontFamily: 'Noto Sans Tamil, serif',
                        fontSize: '20px',
                        color: '#d4a017',
                        marginBottom: '4px',
                      }}>
                        {highlight(r.titleTamil, query)}
                      </div>
                    )}

                    {/* English title */}
                    <h2 style={{
                      fontSize: r.titleTamil ? '15px' : '18px',
                      color: r.titleTamil ? '#8a8aa0' : '#fdf6e3',
                      margin: '0 0 8px',
                      fontWeight: r.titleTamil ? 400 : 600,
                    }}>
                      {highlight(r.title, query)}
                    </h2>

                    {/* Author */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#8a8aa0', marginBottom: r.excerptTamil || r.description ? '12px' : 0 }}>
                      <span>
                        by{' '}
                        <strong style={{ color: '#fdf6e3' }}>
                          {r.authorTamil ? (
                            <>
                              <span style={{ fontFamily: 'Noto Sans Tamil, serif' }}>
                                {highlight(r.authorTamil, query)}
                              </span>
                              {' '}
                              <span style={{ opacity: 0.6 }}>({r.author})</span>
                            </>
                          ) : highlight(r.author, query)}
                        </strong>
                      </span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span>{r.period}</span>
                    </div>

                    {/* Excerpt Tamil */}
                    {r.excerptTamil && (
                      <div style={{
                        fontFamily: 'Noto Sans Tamil, serif',
                        fontSize: '15px',
                        color: '#d4a01790',
                        fontStyle: 'italic',
                        borderLeft: '2px solid #d4a01730',
                        paddingLeft: '12px',
                        marginTop: '10px',
                      }}>
                        {highlight(r.excerptTamil, query)}
                      </div>
                    )}

                    {/* Description snippet */}
                    {!r.excerptTamil && r.description && (
                      <p style={{
                        fontSize: '13px',
                        color: '#8a8aa0',
                        margin: '8px 0 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.7,
                      }}>
                        {highlight(r.description, query)}
                      </p>
                    )}
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: '#1a1040',
          border: '1px solid #2a1f5c',
          borderRadius: '16px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📚</div>
          <h2 style={{ fontSize: '20px', color: '#fdf6e3', marginBottom: '8px' }}>
            No results for &ldquo;{query}&rdquo;
          </h2>
          <p style={{ color: '#8a8aa0', fontSize: '15px', marginBottom: '28px' }}>
            This work may not yet be in the index. Help preserve it on the Tamizhi blockchain.
          </p>
          <Link href="/submit" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #d4a017, #b8860b)',
            color: '#0a0618',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '15px',
          }}>
            Submit this Work →
          </Link>
        </div>
      )}

      {/* Empty / recent searches */}
      {!loading && !searched && (
        <div>
          {recentSearches.length > 0 ? (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}>
                <span style={{ fontSize: '13px', color: '#8a8aa0', fontWeight: 600, letterSpacing: '0.06em' }}>
                  RECENT SEARCHES
                </span>
                <button
                  onClick={clearRecent}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8a8aa0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#ef4444')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#8a8aa0')}
                >
                  Clear all
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleRecentClick(s)}
                    style={{
                      background: '#1a1040',
                      border: '1px solid #2a1f5c',
                      color: '#fdf6e3',
                      padding: '7px 16px',
                      borderRadius: '999px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = '#d4a017'
                      el.style.color = '#d4a017'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = '#2a1f5c'
                      el.style.color = '#fdf6e3'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8a8aa0' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>🔍</div>
              <p style={{ fontSize: '15px', lineHeight: 1.7 }}>
                Start typing to search across all indexed Tamil literary works.
                <br />
                <span style={{ fontSize: '13px', opacity: 0.6 }}>
                  Try searching for &ldquo;Thiruvalluvar&rdquo; or &ldquo;திருக்குறள்&rdquo;
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
