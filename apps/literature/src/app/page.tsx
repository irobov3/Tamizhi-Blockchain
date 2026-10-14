'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import WorkCard from '@/components/WorkCard'
import { getWorks } from '@/lib/api'
import { MOCK_WORKS } from '@/lib/api'
import type { LiteratureWork } from '@/lib/types'
import { formatNumber } from '@/lib/format'

const GENRES: { value: LiteratureWork['genre'] | ''; label: string; labelTamil?: string }[] = [
  { value: '',            label: 'All Works' },
  { value: 'poetry',     label: 'Poetry',     labelTamil: 'கவிதை' },
  { value: 'epic',       label: 'Epic',       labelTamil: 'காவியம்' },
  { value: 'grammar',    label: 'Grammar',    labelTamil: 'இலக்கணம்' },
  { value: 'philosophy', label: 'Philosophy', labelTamil: 'தத்துவம்' },
  { value: 'history',    label: 'History',    labelTamil: 'வரலாறு' },
]

const PAGE_SIZE = 9

export default function BrowsePage() {
  const [works, setWorks] = useState<LiteratureWork[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeGenre, setActiveGenre] = useState<LiteratureWork['genre'] | ''>('')
  const [page, setPage] = useState(0)

  // Derived stats from works
  const authors = new Set(MOCK_WORKS.map((w) => w.author)).size
  const verified = MOCK_WORKS.filter((w) => w.verified).length

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getWorks(PAGE_SIZE, page * PAGE_SIZE).then(({ works: w, total: t }) => {
      if (cancelled) return
      // Filter by genre client-side if needed
      const filtered = activeGenre ? w.filter((wk) => wk.genre === activeGenre) : w
      setWorks(filtered)
      setTotal(activeGenre ? filtered.length : t)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      const filtered = activeGenre
        ? MOCK_WORKS.filter((w) => w.genre === activeGenre)
        : MOCK_WORKS
      const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      setWorks(paged)
      setTotal(filtered.length)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [activeGenre, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleGenre(g: LiteratureWork['genre'] | '') {
    setActiveGenre(g)
    setPage(0)
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(160deg, #1a0a40 0%, #0e0824 50%, #0a0618 100%)',
        borderBottom: '1px solid #2a1f5c',
        padding: '72px 24px 64px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background Tamil glyph decoration */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Noto Sans Tamil, serif',
          fontSize: '280px',
          color: '#d4a017',
          opacity: 0.03,
          userSelect: 'none',
          letterSpacing: '-20px',
          pointerEvents: 'none',
        }}>
          தமிழ்
        </div>

        <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto' }}>
          <p style={{
            fontFamily: 'Noto Sans Tamil, serif',
            fontSize: '18px',
            color: '#d4a017',
            marginBottom: '16px',
            letterSpacing: '0.04em',
          }}>
            தமிழ் இலக்கிய பாரம்பரியம்
          </p>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 52px)',
            fontWeight: 700,
            color: '#fdf6e3',
            lineHeight: 1.15,
            margin: '0 0 20px',
            letterSpacing: '-0.01em',
          }}>
            Tamil Heritage<br />on the Blockchain
          </h1>
          <p style={{
            fontSize: '17px',
            color: '#8a8aa0',
            maxWidth: '520px',
            margin: '0 auto 40px',
            lineHeight: 1.7,
          }}>
            Discover thousands of years of Tamil literature — immutably preserved,
            openly accessible, and community-verified on the Tamizhi chain.
          </p>

          {/* Stats */}
          <div style={{
            display: 'inline-flex',
            gap: '0',
            background: '#1a1040',
            border: '1px solid #2a1f5c',
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            {[
              { value: formatNumber(MOCK_WORKS.length), label: 'Works' },
              { value: formatNumber(authors), label: 'Authors' },
              { value: formatNumber(verified), label: 'Verified' },
            ].map((s, i) => (
              <div key={s.label} style={{
                padding: '16px 32px',
                borderLeft: i > 0 ? '1px solid #2a1f5c' : 'none',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#d4a017', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '12px', color: '#8a8aa0', marginTop: '4px', letterSpacing: '0.06em' }}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Genre Filter Tabs ── */}
      <section style={{
        background: '#0a0618',
        borderBottom: '1px solid #2a1f5c',
        padding: '0 24px',
        position: 'sticky',
        top: '68px',
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          gap: '4px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {GENRES.map((g) => {
            const isActive = activeGenre === g.value
            return (
              <button
                key={g.value}
                onClick={() => handleGenre(g.value)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '16px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #d4a017' : '2px solid transparent',
                  color: isActive ? '#d4a017' : '#8a8aa0',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#fdf6e3'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#8a8aa0'
                }}
              >
                {g.label}
                {g.labelTamil && (
                  <span style={{
                    fontFamily: 'Noto Sans Tamil, serif',
                    fontSize: '12px',
                    opacity: 0.6,
                  }}>
                    {g.labelTamil}
                  </span>
                )}
              </button>
            )
          })}

          {/* CTA */}
          <div style={{ marginLeft: 'auto', padding: '10px 0', flexShrink: 0 }}>
            <Link
              href="/submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #d4a017, #b8860b)',
                color: '#0a0618',
                padding: '8px 18px',
                borderRadius: '7px',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              + Submit a Work
            </Link>
          </div>
        </div>
      </section>

      {/* ── Works Grid ── */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px 64px' }}>
        {loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: '260px',
                  background: '#1a1040',
                  borderRadius: '14px',
                  border: '1px solid #2a1f5c',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        )}

        {!loading && works.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            color: '#8a8aa0',
          }}>
            <div style={{ fontSize: '56px', marginBottom: '20px', opacity: 0.5 }}>📚</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#fdf6e3' }}>
              No works found
            </h2>
            <p style={{ fontSize: '15px', marginBottom: '24px' }}>
              Try a different genre or{' '}
              <Link href="/submit" style={{ color: '#d4a017', fontWeight: 600 }}>
                submit a new work
              </Link>
              .
            </p>
          </div>
        )}

        {!loading && works.length > 0 && (
          <>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', color: '#8a8aa0' }}>
                {total > 0 && `${formatNumber(total)} work${total !== 1 ? 's' : ''}`}
                {activeGenre && ` in ${activeGenre}`}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}>
              {works.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                marginTop: '48px',
              }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{
                    padding: '9px 20px',
                    background: page === 0 ? '#1a1040' : '#2a1f5c',
                    border: '1px solid #2a1f5c',
                    borderRadius: '8px',
                    color: page === 0 ? '#8a8aa0' : '#fdf6e3',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  ← Previous
                </button>

                <span style={{ fontSize: '14px', color: '#8a8aa0' }}>
                  Page {page + 1} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{
                    padding: '9px 20px',
                    background: page >= totalPages - 1 ? '#1a1040' : '#2a1f5c',
                    border: '1px solid #2a1f5c',
                    borderRadius: '8px',
                    color: page >= totalPages - 1 ? '#8a8aa0' : '#fdf6e3',
                    cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
