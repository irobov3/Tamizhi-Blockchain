'use client'

import Link from 'next/link'
import type { LiteratureWork } from '@/lib/types'
import { formatGenre, genreColor, formatNumber } from '@/lib/format'
import VerifiedBadge from './VerifiedBadge'

interface WorkCardProps {
  work: LiteratureWork
}

export default function WorkCard({ work }: WorkCardProps) {
  const color = genreColor(work.genre)

  return (
    <article
      style={{
        background: '#1a1040',
        border: '1px solid #2a1f5c',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${color}40`
        el.style.borderColor = `${color}60`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
        el.style.borderColor = '#2a1f5c'
      }}
    >
      {/* Colored top border by genre */}
      <div style={{ height: '3px', background: color, flexShrink: 0 }} />

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {/* Badges row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Genre badge */}
          <span style={{
            background: `${color}18`,
            border: `1px solid ${color}40`,
            color,
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            letterSpacing: '0.04em',
          }}>
            {formatGenre(work.genre)}
          </span>

          {/* Language badge */}
          <span style={{
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
            color: '#00d4ff',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
            padding: '2px 8px',
          }}>
            {work.language === 'bilingual' ? 'Bilingual' : 'Tamil'}
          </span>

          {/* Verified */}
          {work.verified && (
            <div style={{ marginLeft: 'auto' }}>
              <VerifiedBadge size="sm" verifiedBy={work.verifiedBy} />
            </div>
          )}
        </div>

        {/* Titles */}
        <div>
          {work.titleTamil && (
            <div style={{
              fontFamily: 'Noto Sans Tamil, serif',
              fontSize: '22px',
              fontWeight: 700,
              color: '#d4a017',
              lineHeight: 1.3,
              marginBottom: '4px',
            }}>
              {work.titleTamil}
            </div>
          )}
          <h3 style={{
            fontSize: work.titleTamil ? '15px' : '18px',
            fontWeight: work.titleTamil ? 500 : 700,
            color: '#fdf6e3',
            margin: 0,
            opacity: work.titleTamil ? 0.8 : 1,
          }}>
            {work.title}
          </h3>
        </div>

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="7" r="4" stroke="#8a8aa0" strokeWidth="1.5" />
            <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#8a8aa0" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '13px', color: '#8a8aa0' }}>
            {work.authorTamil ? (
              <>
                <span style={{ fontFamily: 'Noto Sans Tamil, serif', color: '#fdf6e3' }}>
                  {work.authorTamil}
                </span>
                <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
                <span>{work.author}</span>
              </>
            ) : (
              <span style={{ color: '#fdf6e3' }}>{work.author}</span>
            )}
          </span>
        </div>

        {/* Period badge */}
        <div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(138,138,160,0.12)',
            border: '1px solid rgba(138,138,160,0.2)',
            color: '#8a8aa0',
            borderRadius: '6px',
            fontSize: '11px',
            padding: '3px 8px',
          }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 4.5v4l2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {work.period}
          </span>
        </div>

        {/* Description */}
        <p style={{
          fontSize: '13px',
          color: '#8a8aa0',
          lineHeight: 1.7,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {work.description}
        </p>

        {/* Tamil excerpt */}
        {work.excerptTamil && (
          <div style={{
            borderLeft: '2px solid #d4a01740',
            paddingLeft: '12px',
          }}>
            <p style={{
              fontFamily: 'Noto Sans Tamil, serif',
              fontSize: '14px',
              color: '#d4a017',
              fontStyle: 'italic',
              margin: 0,
              lineHeight: 1.8,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {work.excerptTamil}
            </p>
          </div>
        )}

        {/* Footer row */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* View count */}
          {work.viewCount !== undefined && (
            <span style={{ fontSize: '12px', color: '#8a8aa0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              {formatNumber(work.viewCount)}
            </span>
          )}

          {/* Read More */}
          <Link
            href={`/works/${work.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: color,
              fontWeight: 600,
              fontSize: '13px',
              padding: '6px 14px',
              borderRadius: '7px',
              border: `1px solid ${color}40`,
              background: `${color}10`,
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.background = `${color}20`
              el.style.borderColor = `${color}80`
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.background = `${color}10`
              el.style.borderColor = `${color}40`
            }}
          >
            Read More →
          </Link>
        </div>
      </div>
    </article>
  )
}
