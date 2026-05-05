import type { Metadata } from 'next';
import Link from 'next/link';
import { getChainStats } from '@/lib/api';
import { formatNumber } from '@/lib/format';

export const metadata: Metadata = {
  title: 'தமிழி | Tamizhi Literary Browser',
  description:
    'Browse, search, and preserve Tamil literary heritage on the Tamizhi blockchain.',
};

// Shared colour tokens
export const COLORS = {
  bg: '#fdf6e3',
  surface: '#fff',
  border: '#e8e0d0',
  red: '#c0392b',
  redDark: '#962d22',
  gold: '#f39c12',
  text: '#2d1b00',
  textMuted: '#7a6545',
  textLight: '#9b8469',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Best-effort stats for footer; never throws to avoid breaking navigation
  const stats = await getChainStats().catch(() => ({ total_works: 0, total_nfts: 0 }));

  return (
    <html lang="ta">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Noto Sans Tamil for proper Unicode rendering */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; }
          body {
            background: ${COLORS.bg};
            color: ${COLORS.text};
            font-family: 'Inter', 'Noto Sans Tamil', system-ui, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }
          a { color: inherit; }
          .tamil { font-family: 'Noto Sans Tamil', serif; }
          @media (max-width: 640px) {
            .hide-mobile { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        {/* ── Header ── */}
        <header
          style={{
            background: COLORS.red,
            color: '#fff',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 24px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
            }}
          >
            {/* Logo */}
            <Link
              href="/"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  background: COLORS.gold,
                  color: COLORS.red,
                  borderRadius: '8px',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontFamily: 'Noto Sans Tamil, serif',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
                aria-hidden="true"
              >
                த
              </span>
              <div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    fontFamily: 'Noto Sans Tamil, serif',
                    color: '#fff',
                    lineHeight: 1.1,
                  }}
                >
                  தமிழி
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em' }}>
                  LITERARY BROWSER
                </div>
              </div>
            </Link>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Nav */}
            <nav aria-label="Main navigation">
              <ul
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                }}
              >
                {[
                  { href: '/',        label: 'Browse' },
                  { href: '/search',  label: 'Search' },
                  { href: '/submit',  label: 'Submit' },
                  { href: '/about',   label: 'About' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'background 0.15s, color 0.15s',
                        display: 'block',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.background = 'rgba(255,255,255,0.15)';
                        el.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.background = 'transparent';
                        el.style.color = 'rgba(255,255,255,0.9)';
                      }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ minHeight: 'calc(100vh - 64px - 80px)' }}>
          {children}
        </main>

        {/* ── Footer ── */}
        <footer
          style={{
            borderTop: `1px solid ${COLORS.border}`,
            background: '#f5ede0',
            padding: '20px 24px',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                color: COLORS.textMuted,
                fontFamily: 'Noto Sans Tamil, serif',
              }}
            >
              தமிழி — Preserving Tamil Heritage on the Blockchain
            </span>

            {/* Chain stats */}
            <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: COLORS.textMuted }}>
              <span>
                <strong style={{ color: COLORS.red }}>{formatNumber(stats.total_works)}</strong>{' '}
                works on-chain
              </span>
              <span>
                <strong style={{ color: COLORS.gold }}>{formatNumber(stats.total_nfts)}</strong>{' '}
                NFTs minted
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
