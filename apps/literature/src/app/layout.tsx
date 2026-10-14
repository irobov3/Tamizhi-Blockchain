import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'தமிழி Literature | Tamil Heritage on the Blockchain',
  description:
    'Browse, search, and preserve Tamil literary heritage on the Tamizhi blockchain. Discover thousands of years of Tamil literature — immutably recorded.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ta">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; }
          body {
            background: #0e0824;
            color: #fdf6e3;
            font-family: 'Inter', 'Noto Sans Tamil', system-ui, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }
          a { color: inherit; text-decoration: none; }
          .tamil { font-family: 'Noto Sans Tamil', serif; }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </head>
      <body>
        {/* ── Header ── */}
        <header style={{
          background: '#0a0618',
          borderBottom: '1px solid #2a1f5c',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            height: '68px',
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
          }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={{
                width: '42px',
                height: '42px',
                background: 'linear-gradient(135deg, #d4a017, #b8860b)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontFamily: 'Noto Sans Tamil, serif',
                fontWeight: 700,
                color: '#0a0618',
                boxShadow: '0 0 16px rgba(212,160,23,0.4)',
              }}>
                த
              </div>
              <div>
                <div style={{
                  fontSize: '20px',
                  fontFamily: 'Noto Sans Tamil, serif',
                  fontWeight: 700,
                  color: '#d4a017',
                  lineHeight: 1.1,
                  letterSpacing: '0.02em',
                }}>
                  தமிழி
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#fdf6e3',
                  letterSpacing: '0.12em',
                  fontWeight: 500,
                  opacity: 0.85,
                }}>
                  LITERATURE
                </div>
              </div>
            </Link>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Nav links */}
            <nav aria-label="Main navigation">
              <ul style={{ listStyle: 'none', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[
                  { href: '/',       label: 'Browse' },
                  { href: '/search', label: 'Search' },
                  { href: '/submit', label: 'Submit' },
                  { href: '/about',  label: 'About' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      style={{
                        color: 'rgba(253,246,227,0.75)',
                        padding: '7px 16px',
                        borderRadius: '7px',
                        fontSize: '14px',
                        fontWeight: 500,
                        display: 'block',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement
                        el.style.background = 'rgba(212,160,23,0.12)'
                        el.style.color = '#d4a017'
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement
                        el.style.background = 'transparent'
                        el.style.color = 'rgba(253,246,227,0.75)'
                      }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Connect Wallet */}
            <Link
              href="/submit"
              style={{
                background: 'linear-gradient(135deg, #d4a017, #b8860b)',
                color: '#0a0618',
                padding: '9px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(212,160,23,0.25)',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.boxShadow = '0 0 24px rgba(212,160,23,0.5)'
                el.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.boxShadow = '0 0 12px rgba(212,160,23,0.25)'
                el.style.transform = 'translateY(0)'
              }}
            >
              Connect Wallet
            </Link>
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ minHeight: 'calc(100vh - 68px - 72px)' }}>
          {children}
        </main>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: '1px solid #2a1f5c',
          background: '#0a0618',
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div>
              <span style={{
                fontFamily: 'Noto Sans Tamil, serif',
                fontSize: '14px',
                color: '#d4a017',
                fontWeight: 600,
              }}>
                தமிழி
              </span>
              <span style={{ fontSize: '14px', color: '#8a8aa0', marginLeft: '8px' }}>
                — Preserving Tamil Heritage on the Blockchain
              </span>
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#8a8aa0' }}>
              <Link href="/about" style={{ color: '#8a8aa0' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#d4a017')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#8a8aa0')}
              >
                About
              </Link>
              <Link href="/submit" style={{ color: '#8a8aa0' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#d4a017')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#8a8aa0')}
              >
                Submit a Work
              </Link>
              <span>Tamizhi Chain</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
