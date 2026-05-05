'use client';

import Link from 'next/link';
import type { LiteraryWork } from '@/lib/types';
import WorkBadge from './WorkBadge';
import VerifiedBadge from './VerifiedBadge';

interface WorkCardProps {
  work: LiteraryWork;
}

export default function WorkCard({ work }: WorkCardProps) {
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid #e8e0d0',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(192,57,43,0.12)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Badges row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <WorkBadge type={work.work_type} size="sm" />
        {work.verified && <VerifiedBadge size="sm" />}
      </div>

      {/* Title */}
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontFamily: '"Noto Sans Tamil", "Latha", serif',
            color: '#2d1b00',
            lineHeight: 1.4,
          }}
        >
          {work.title}
        </h3>
        {work.title_transliteration && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: '#6b5a3e',
              fontStyle: 'italic',
            }}
          >
            {work.title_transliteration}
          </p>
        )}
      </div>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="7" r="4" stroke="#c0392b" strokeWidth="1.5" />
          <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: '14px', color: '#4a3520', fontWeight: 500 }}>
          {work.author}
        </span>
      </div>

      {/* Language + era */}
      {(work.language || work.century || work.era) && (
        <div
          style={{
            fontSize: '12px',
            color: '#7a6545',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {work.language && (
            <span>
              <strong>Lang:</strong> {work.language}
            </span>
          )}
          {(work.century || work.era) && (
            <span>
              <strong>Era:</strong> {work.century ?? work.era}
            </span>
          )}
        </div>
      )}

      {/* View link */}
      <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
        <Link
          href={`/works/${work.work_id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#c0392b',
            fontWeight: 600,
            fontSize: '14px',
            textDecoration: 'none',
            borderBottom: '1px solid transparent',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#c0392b')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'transparent')}
        >
          View
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
