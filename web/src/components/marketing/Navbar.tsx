'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '/#home' },
  { label: 'History', href: '/#history' },
  { label: 'Ecosystem', href: '/ai' },
  { label: 'Docs', href: '/whitepaper' },
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
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 py-6 ${
          scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100 py-4 shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-500">
              <span className="tamil-text text-white font-black text-2xl">த</span>
            </div>
            <div className="flex flex-col">
              <span className="text-secondary font-black tracking-tight text-xl leading-none">Tamizhi</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-primary">Heritage AI</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-bold uppercase tracking-widest text-secondary/50 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link 
              href="/ai" 
              className="px-8 py-3 bg-secondary text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary transition-colors shadow-xl shadow-secondary/10"
            >
              Launch Application
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden text-secondary"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[200] bg-white p-12 flex flex-col"
          >
            <div className="flex items-center justify-between mb-20">
              <Link href="/" className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <span className="tamil-text text-white font-black text-xl">த</span>
                </div>
                <span className="text-secondary font-black text-xl">Tamizhi</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-secondary">
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="flex flex-col gap-10 mb-20">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-5xl font-black text-secondary hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Link href="/ai" className="btn-primary text-center">Launch Application</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
