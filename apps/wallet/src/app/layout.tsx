import type { Metadata } from 'next';
import { Inter, Noto_Sans_Tamil } from 'next/font/google';
import WalletButton from '@/components/WalletButton';
import Link from 'next/link';

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
  description: 'Tamizhi blockchain wallet — manage TMZ tokens, rewards, and literary heritage.',
};

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/send', label: 'Send' },
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
        {/* Background gradient orbs */}
        <div style={orbTopRight} aria-hidden="true" />
        <div style={orbBottomLeft} aria-hidden="true" />

        {/* Navigation */}
        <header style={headerStyle}>
          <nav style={navStyle}>
            {/* Logo */}
            <Link href="/" style={logoStyle}>
              <span style={logoTamilStyle}>த</span>
              <span style={logoTextStyle}>Tamizhi</span>
            </Link>

            {/* Nav links */}
            <ul style={navListStyle}>
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} style={navLinkStyle}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Wallet button */}
            <WalletButton />
          </nav>
        </header>

        {/* Main content */}
        <main style={mainStyle}>{children}</main>

        {/* Footer */}
        <footer style={footerStyle}>
          <span style={{ fontFamily: 'var(--font-noto-tamil), sans-serif', color: '#f5a623' }}>
            தமிழி
          </span>{' '}
          Tamizhi Chain · tamizhi-testnet-1
        </footer>

        <style>{globalStyles}</style>
      </body>
    </html>
  );
}

// ---- Styles ----

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  minHeight: '100vh',
  background: 'var(--color-bg)',
  color: 'var(--color-cream)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  position: 'relative',
  overflowX: 'hidden',
};

const orbTopRight: React.CSSProperties = {
  position: 'fixed',
  top: '-120px',
  right: '-120px',
  width: '400px',
  height: '400px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)',
  pointerEvents: 'none',
  zIndex: 0,
};

const orbBottomLeft: React.CSSProperties = {
  position: 'fixed',
  bottom: '-80px',
  left: '-80px',
  width: '300px',
  height: '300px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(90,60,180,0.18) 0%, transparent 70%)',
  pointerEvents: 'none',
  zIndex: 0,
};

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  background: 'rgba(26, 16, 64, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(245, 166, 35, 0.15)',
};

const navStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 24px',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  gap: '32px',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  textDecoration: 'none',
  flexShrink: 0,
};

const logoTamilStyle: React.CSSProperties = {
  fontSize: '26px',
  color: '#f5a623',
  fontFamily: 'var(--font-noto-tamil), sans-serif',
  lineHeight: 1,
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#fdf6e3',
  letterSpacing: '-0.02em',
};

const navListStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  flex: 1,
};

const navLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 14px',
  color: 'rgba(253,246,227,0.75)',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 500,
  borderRadius: '6px',
  transition: 'color 0.15s, background 0.15s',
};

const mainStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '32px 24px 64px',
  position: 'relative',
  zIndex: 1,
};

const footerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px',
  fontSize: '13px',
  color: 'rgba(253,246,227,0.35)',
  borderTop: '1px solid rgba(245,166,35,0.08)',
  position: 'relative',
  zIndex: 1,
};

const globalStyles = `
  :root {
    --color-bg: #1a1040;
    --color-bg-secondary: #231560;
    --color-gold: #f5a623;
    --color-cream: #fdf6e3;
    --color-gold-muted: rgba(245,166,35,0.6);
    --color-card: rgba(255,255,255,0.05);
    --color-border: rgba(245,166,35,0.18);
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a:hover {
    color: #f5a623 !important;
    background: rgba(245,166,35,0.08) !important;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(245,166,35,0.3);
    border-radius: 3px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
`;
