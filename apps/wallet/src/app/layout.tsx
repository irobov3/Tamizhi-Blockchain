import type { Metadata } from 'next';
import { Inter, Noto_Sans_Tamil } from 'next/font/google';
import Link from 'next/link';
import WalletButton from '@/components/WalletButton';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  variable: '--font-noto-tamil',
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tamizhi Wallet',
  description: 'Tamizhi blockchain wallet — manage TMZ tokens, staking rewards, and Tamil literary heritage.',
};

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/send', label: 'Send' },
  { href: '/stake', label: 'Stake' },
  { href: '/rewards', label: 'Rewards' },
  { href: '/literature', label: 'Literature' },
  { href: '/nodes', label: 'Nodes' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ta" className={`${inter.variable} ${notoSansTamil.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={bodyStyle}>
        {/* Ambient gradient orbs */}
        <div style={orbTopRight} aria-hidden="true" />
        <div style={orbBottomLeft} aria-hidden="true" />

        <div style={layoutStyle}>
          {/* ── Sidebar ───────────────────────────────────────── */}
          <aside style={sidebarStyle}>
            <Link href="/" style={logoLinkStyle}>
              <span style={logoTamilStyle}>தமிழி</span>
              <span style={logoSubStyle}>Wallet</span>
            </Link>

            <nav style={{ marginTop: '32px' }}>
              <ul style={navListStyle}>
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} style={navLinkStyle}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div style={sidebarFooterStyle}>
              <div style={chainBadgeStyle}>tamizhi-testnet-1</div>
            </div>
          </aside>

          {/* ── Main area ─────────────────────────────────────── */}
          <div style={mainWrapStyle}>
            {/* Top bar */}
            <header style={topBarStyle}>
              <div style={{ flex: 1 }} />
              <WalletButton />
            </header>

            {/* Page content */}
            <main style={mainContentStyle}>{children}</main>
          </div>
        </div>

        <style>{globalStyles}</style>
      </body>
    </html>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  minHeight: '100vh',
  background: '#0e0824',
  color: '#fdf6e3',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  overflowX: 'hidden',
};

const orbTopRight: React.CSSProperties = {
  position: 'fixed',
  top: '-140px',
  right: '-140px',
  width: '420px',
  height: '420px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(212,160,23,0.10) 0%, transparent 70%)',
  pointerEvents: 'none',
  zIndex: 0,
};

const orbBottomLeft: React.CSSProperties = {
  position: 'fixed',
  bottom: '-100px',
  left: '160px',
  width: '340px',
  height: '340px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
  pointerEvents: 'none',
  zIndex: 0,
};

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  position: 'relative',
  zIndex: 1,
};

const sidebarStyle: React.CSSProperties = {
  width: '200px',
  flexShrink: 0,
  background: '#0a0618',
  borderRight: '1px solid rgba(42,31,92,0.8)',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 0',
  position: 'sticky',
  top: 0,
  height: '100vh',
  overflowY: 'auto',
};

const logoLinkStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  textDecoration: 'none',
  padding: '0 16px 0',
};

const logoTamilStyle: React.CSSProperties = {
  fontFamily: 'var(--font-noto-tamil), sans-serif',
  fontSize: '24px',
  color: '#d4a017',
  lineHeight: 1,
};

const logoSubStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'rgba(253,246,227,0.6)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
};

const navListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: '0 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const navLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '9px 14px',
  color: 'rgba(253,246,227,0.65)',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 500,
  borderRadius: '8px',
  transition: 'color 0.15s, background 0.15s',
};

const sidebarFooterStyle: React.CSSProperties = {
  marginTop: 'auto',
  padding: '16px 16px 8px',
};

const chainBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontFamily: 'monospace',
  color: 'rgba(0,212,255,0.6)',
  background: 'rgba(0,212,255,0.06)',
  border: '1px solid rgba(0,212,255,0.12)',
  borderRadius: '4px',
  padding: '4px 8px',
  textAlign: 'center',
};

const mainWrapStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0 28px',
  height: '60px',
  background: 'rgba(10,6,24,0.7)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(42,31,92,0.5)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const mainContentStyle: React.CSSProperties = {
  padding: '32px 28px 64px',
  flex: 1,
};

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; }

  body { -webkit-font-smoothing: antialiased; }

  a { transition: color 0.15s, background 0.15s; }
  a:hover { color: #d4a017 !important; background: rgba(212,160,23,0.08) !important; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(212,160,23,0.25); border-radius: 3px; }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
