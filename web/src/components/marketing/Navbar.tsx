'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Wallet, ExternalLink, ChevronDown } from 'lucide-react';

const navLinks = [
  { label: 'Explorer', href: '/explorer' },
  { label: 'Literature', href: '/#literature' },
  { label: 'Wallet', href: '/wallet' },
  { label: 'Docs', href: '/docs' },
  { label: 'Roadmap', href: '/roadmap' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrolled
            ? 'bg-[rgba(14,8,36,0.95)] backdrop-blur-xl border-b border-[#2a1f5c] shadow-[0_4px_32px_rgba(0,0,0,0.4)]'
            : 'bg-[rgba(14,8,36,0.7)] backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#2563eb] flex items-center justify-center shadow-lg shadow-purple-900/40 group-hover:shadow-purple-700/60 transition-shadow">
                <span className="tamil-text text-white font-black text-lg leading-none">த</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="tamil-text text-[#d4a017] font-black text-lg tracking-tight">தமிழி</span>
                <span className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">Blockchain</span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/wallet"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2a1f5c] text-white/70 hover:text-white hover:border-[#7c3aed]/60 text-sm font-medium transition-all duration-200"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Link>
              <Link
                href="/explorer"
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#0ea5e9] text-[#0e0824] text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,212,255,0.3)]"
              >
                Launch App
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              className="lg:hidden text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[200] bg-[#0e0824] flex flex-col"
          >
            {/* Mobile header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-[#2a1f5c]">
              <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#2563eb] flex items-center justify-center">
                  <span className="tamil-text text-white font-black text-base leading-none">த</span>
                </div>
                <span className="tamil-text text-[#d4a017] font-black text-lg">தமிழி</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile nav links */}
            <div className="flex-1 flex flex-col justify-center px-6 gap-2">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-4 text-2xl font-bold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Mobile CTA */}
            <div className="px-6 pb-10 space-y-3">
              <Link
                href="/wallet"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-[#2a1f5c] text-white/70 hover:text-white text-sm font-semibold transition-colors"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Link>
              <Link
                href="/explorer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#0ea5e9] text-[#0e0824] text-sm font-bold"
              >
                Launch App
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
