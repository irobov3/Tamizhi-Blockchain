'use client';

import Link from 'next/link';
import { Twitter, Github, Mail, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white pt-32 pb-16 border-t border-gray-100">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-24">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center">
                <span className="tamil-text text-white font-black text-lg">த</span>
              </div>
              <span className="text-secondary font-black tracking-tight text-2xl">Tamizhi</span>
            </Link>
            <p className="text-secondary/50 text-sm leading-relaxed mb-10 max-w-xs">
              The world&apos;s first dedicated digital heritage platform for the preservation of Tamil classical literature and Dravidian history.
            </p>
            <div className="flex items-center gap-6">
              {[Twitter, Github, Mail].map((Icon, i) => (
                <Link key={i} href="#" className="w-12 h-12 rounded-2xl border border-gray-100 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 group">
                  <Icon className="w-5 h-5 text-secondary group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-secondary font-black uppercase text-xs tracking-widest mb-10">Product</h4>
            <ul className="space-y-6">
              {['Heritage AI', 'Classical Archive', 'Blockchain Core', 'Governance'].map((link) => (
                <li key={link}>
                  <Link href="#" className="text-secondary/50 hover:text-primary transition-colors text-sm font-bold">{link}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-secondary font-black uppercase text-xs tracking-widest mb-10">Company</h4>
            <ul className="space-y-6">
              {['About Us', 'Scholar Program', 'Manifesto', 'Contact'].map((link) => (
                <li key={link}>
                  <Link href="#" className="text-secondary/50 hover:text-primary transition-colors text-sm font-bold">{link}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-secondary font-black uppercase text-xs tracking-widest mb-10">Location</h4>
            <div className="space-y-8 text-sm text-secondary/50">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-primary shrink-0" />
                <p className="font-bold leading-relaxed">Madurai, Tamil Nadu <br /> The Cultural Capital of Tamil Heritage</p>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="w-6 h-6 text-primary shrink-0" />
                <p className="font-bold">heritage@tamizhi.ai</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-10">
          <p className="text-xs font-bold text-secondary/30 uppercase tracking-widest">
            © {currentYear} Tamizhi Foundation. Digitizing Pride.
          </p>
          <div className="flex items-center gap-12 text-xs font-bold text-secondary/30 uppercase tracking-widest">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <span className="tamil-text opacity-50">தமிழால் இணைவோம்</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
