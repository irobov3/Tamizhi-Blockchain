import type { Metadata } from 'next';
import { Noto_Sans_Tamil, Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Toaster } from '@/components/ui/Toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  variable: '--font-tamil',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Tamizhi | The Digital Heritage of Dravidam',
    template: '%s | Tamizhi',
  },
  description:
    'Tamizhi is a premium decentralized platform preserving 2,000 years of Tamil literature and history through advanced AI and blockchain technology.',
  keywords: [
    'Tamil',
    'Literature',
    'History',
    'Blockchain',
    'AI',
    'Tamizhi',
    'Dravidam',
    'Heritage',
    'தமிழ்',
  ],
  authors: [{ name: 'Tamizhi Foundation' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://tamizhi.ai',
    siteName: 'Tamizhi',
    title: 'Tamizhi | The Digital Heritage of Dravidam',
    description: 'Digitizing and preserving the 2,000-year legacy of Tamil culture.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ta" className={`dark ${inter.variable} ${notoSansTamil.variable} ${playfair.variable}`}>
      <body
        className={`${inter.className} bg-background text-foreground antialiased min-h-screen selection:bg-primary/30`}
      >
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
