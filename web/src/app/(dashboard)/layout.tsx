'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  BookOpen,
  Search,
  MessageSquare,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Copy,
  Check,
} from 'lucide-react';
import { useWalletStore } from '@/store/wallet.store';
import { clsx } from 'clsx';

const navItems = [
  {
    href: '/wallet',
    label: 'Wallet',
    labelTamil: 'நிதியிடம்',
    icon: Wallet,
  },
  {
    href: '/literature',
    label: 'Literature',
    labelTamil: 'இலக்கியம்',
    icon: BookOpen,
  },
  {
    href: '/explorer',
    label: 'Explorer',
    labelTamil: 'ஆய்வாளர்',
    icon: Search,
  },
  {
    href: '/messenger',
    label: 'Messenger',
    labelTamil: 'தூதர்',
    icon: MessageSquare,
  },
  {
    href: '/ai',
    label: 'AI Assistant',
    labelTamil: 'செயற்கை அறிவு',
    icon: Sparkles,
  },
];

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { walletAddress, isConnected, disconnectWallet } = useWalletStore();

  const copyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-background-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm tamil-text">த</span>
        </div>
        <div>
          <span className="text-white font-bold text-base block leading-tight">Tamizhi</span>
          <span className="tamil-text text-primary-400 text-xs">தமிழி</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary-400 bg-primary-500/10 border border-primary-500/20 font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              <item.icon className={clsx('w-5 h-5', isActive ? 'text-primary-400' : 'text-text-muted')} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className="tamil-text text-xs text-text-muted truncate">{item.labelTamil}</div>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-primary-400 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Wallet Info */}
      <div className="p-4 border-t border-background-border">
        {isConnected && walletAddress ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-DEFAULT border border-background-border">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-muted mb-1">Connected Wallet</div>
                <div className="text-sm text-text-primary font-mono truncate">
                  {truncateAddress(walletAddress)}
                </div>
              </div>
              <button
                onClick={copyAddress}
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors flex-shrink-0 ml-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-text-muted" />
                )}
              </button>
            </div>
            <button
              onClick={disconnectWallet}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        ) : (
          <Link
            href="/wallet"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0D0D1A] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-background-card border-r border-background-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-background-card border-r border-background-border lg:hidden flex flex-col"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-16 border-b border-background-border bg-background-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-500 to-accent flex items-center justify-center">
                <span className="text-white font-bold text-xs tamil-text">த</span>
              </div>
              <span className="font-bold text-white">Tamizhi</span>
            </div>
          </div>
          {isConnected && walletAddress && (
            <div className="flex items-center gap-2 text-sm text-text-secondary font-mono">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {truncateAddress(walletAddress)}
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
