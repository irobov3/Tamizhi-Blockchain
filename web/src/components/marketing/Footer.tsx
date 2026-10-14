'use client';

import Link from 'next/link';
import { Twitter, Github, MessageCircle, Send } from 'lucide-react';

const footerColumns = [
  {
    heading: 'Product',
    links: [
      { label: 'Block Explorer', href: '/explorer' },
      { label: 'Wallet', href: '/wallet' },
      { label: 'Messenger', href: '/messenger' },
      { label: 'AI Assistant', href: '/ai' },
      { label: 'Web Browser', href: '#' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Whitepaper', href: '/whitepaper' },
      { label: 'GitHub', href: 'https://github.com/tamizhi' },
      { label: 'RPC Endpoints', href: '/docs#chain-config' },
      { label: 'Smart Contracts', href: '/docs#cosmwasm' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'Twitter / X', href: 'https://twitter.com/tamizhiai' },
      { label: 'Discord', href: '#' },
      { label: 'Telegram', href: '#' },
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'Tokenomics', href: '/tokenomics' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Use', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'Disclaimer', href: '/whitepaper#disclaimer' },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, label: 'Twitter', href: 'https://twitter.com/tamizhiai' },
  { icon: Github, label: 'GitHub', href: 'https://github.com/tamizhi' },
  { icon: MessageCircle, label: 'Discord', href: '#' },
  { icon: Send, label: 'Telegram', href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-[#0a0618] border-t border-[#1a1040]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-5 group w-fit">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#2563eb] flex items-center justify-center shadow-lg shadow-purple-900/40">
                <span className="tamil-text text-white font-black text-lg leading-none">த</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="tamil-text text-[#d4a017] font-black text-lg">தமிழி</span>
                <span className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">Blockchain</span>
              </div>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed mb-6 max-w-xs">
              The world&apos;s first blockchain dedicated to Tamil civilization — preserving 2,000+ years of literature on an immutable, community-owned chain.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg border border-[#2a1f5c] flex items-center justify-center text-white/40 hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">{col.heading}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm text-white/40 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[#1a1040] pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">
              © 2026 Tamizhi Foundation. Built with ❤️ for Tamil civilization.
            </p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/30 text-xs font-mono">tamizhi-1 — testnet live</span>
            </div>
            <p className="tamil-text text-white/20 text-xs">
              யாதும் ஊரே யாவரும் கேளிர்
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
