'use client';

import { useState, useEffect } from 'react';
import WorkCard from '@/components/WorkCard';
import { getExplorerWorks } from '@/lib/api';
import type { LiteraryWork, WorkType } from '@/lib/types';

const WORK_TYPES: { value: WorkType | ''; label: string }[] = [
  { value: '',        label: 'All types' },
  { value: 'poem',    label: 'Poem (கவிதை)' },
  { value: 'prose',   label: 'Prose (உரைநடை)' },
  { value: 'epic',    label: 'Epic (காவியம்)' },
  { value: 'grammar', label: 'Grammar (இலக்கணம்)' },
];

const LANGUAGES = ['All languages', 'Tamil', 'Sanskrit', 'Telugu', 'Kannada', 'Malayalam'];

const selectStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: '2px solid #e8e0d0',
  borderRadius: '8px',
  background: '#fff',
  color: '#2d1b00',
  fontSize: '14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  outline: 'none',
  minWidth: '160px',
};

export default function BrowsePage() {
  const [works, setWorks] = useState<LiteraryWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [workType, setWorkType] = useState<WorkType | ''>('');
  const [language, setLanguage] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getExplorerWorks({
      work_type: workType || undefined,
      language: language || undefined,
      verified: verifiedOnly || undefined,
    })
      .then((data) => { if (!cancelled) { setWorks(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [workType, language, verifiedOnly]);

  return (
    <div>
      {/* ── Hero ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #c0392b 0%, #962d22 60%, #7b1e17 100%)',
          color: '#fff',
          padding: '64px 24px 72px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Tamil pattern overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.06,
            fontSize: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Noto Sans Tamil, serif',
            userSelect: 'none',
            letterSpacing: '20px',
            overflow: 'hidden',
          }}
        >
          ஓம் தமிழ் ஓம்
        </div>

        <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
          <p
            style={{
              fontFamily: 'Noto Sans Tamil, serif',
              fontSize: '18px',
              color: '#f8d7a4',
              marginBottom: '12px',
              letterSpacing: '0.05em',
            }}
          >
            தமிழ் இலக்கிய பாரம்பரியம் — சங்கிலித்தொழில்நுட்பத்தில்
          </p>
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 700,
              lineHeight: 1.2,
              margin: '0 0 16px',
            }}
          >
            Tamil Literary Heritage<br />on the Blockchain
          </h1>
          <p
            style={{
              fontSize: '17px',
              color: 'rgba(255,255,255,0.82)',
              maxWidth: '520px',
              margin: '0 auto',
            }}
          >
            Discover and preserve thousands of years of Tamil literature —
            immutably recorded, openly accessible, NFT-owned.
          </p>
        </div>
      </section>

      {/* ── Filter bar ── */}
      <section
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e0d0',
          padding: '16px 24px',
          position: 'sticky',
          top: '64px',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#7a6545' }}>
            Filter:
          </label>

          {/* Work type */}
          <select
            value={workType}
            onChange={(e) => setWorkType(e.target.value as WorkType | '')}
            style={selectStyle}
            aria-label="Filter by work type"
          >
            {WORK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Language */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value === 'All languages' ? '' : e.target.value)}
            style={selectStyle}
            aria-label="Filter by language"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Verified toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#4a3520',
              userSelect: 'none',
              padding: '8px 14px',
              border: '2px solid',
              borderColor: verifiedOnly ? '#15803d' : '#e8e0d0',
              borderRadius: '8px',
              background: verifiedOnly ? '#dcfce7' : '#fff',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              style={{ accentColor: '#15803d', width: '16px', height: '16px' }}
            />
            Verified only
          </label>

          {/* Result count */}
          {!loading && (
            <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#9b8469' }}>
              {works.length} work{works.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </section>

      {/* ── Work grid ── */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px 64px',
        }}
      >
        {loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: '200px',
                  background: '#f0e8d8',
                  borderRadius: '12px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '10px',
              padding: '20px',
              color: '#991b1b',
              textAlign: 'center',
            }}
          >
            <strong>Could not load works.</strong>
            <br />
            <span style={{ fontSize: '14px' }}>{error}</span>
            <br />
            <span style={{ fontSize: '13px', marginTop: '8px', display: 'block' }}>
              Make sure the chain and explorer API are running at their configured URLs.
            </span>
          </div>
        )}

        {!loading && !error && works.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: '#7a6545',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#4a3520' }}>
              No works found
            </h2>
            <p style={{ fontSize: '15px' }}>
              Try adjusting your filters, or{' '}
              <a href="/submit" style={{ color: '#c0392b', fontWeight: 600 }}>
                submit a new work
              </a>
              .
            </p>
          </div>
        )}

        {!loading && !error && works.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {works.map((work) => (
              <WorkCard key={work.work_id} work={work} />
            ))}
          </div>
        )}
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
