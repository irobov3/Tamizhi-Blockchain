import React, { useEffect, useState } from 'react';
import {
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import TitleBar from './components/common/TitleBar';
import Sidebar from './components/common/Sidebar';
import WalletPage from './pages/WalletPage';
import MessengerPage from './pages/MessengerPage';
import LiteraturePage from './pages/LiteraturePage';
import ExplorerPage from './pages/ExplorerPage';
import AIPage from './pages/AIPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import { useWalletStore } from './store/wallet.store';

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
};

const pageTransition = { duration: 0.18, ease: 'easeOut' };

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { address, isLoaded } = useWalletStore();

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '3px solid var(--tamizhi-saffron)',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading Tamizhi…</p>
        </div>
      </div>
    );
  }

  if (!address) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppShell() {
  const { address, isLoaded, loadWallet } = useWalletStore();
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Listen for tray navigation events
  useEffect(() => {
    if (!window.tamizhi) return;
    window.tamizhi.on('tray:navigate', (path: unknown) => {
      // Use a custom event to trigger navigation since we can't use useNavigate here
      window.dispatchEvent(new CustomEvent('tamizhi:navigate', { detail: path }));
    });
    return () => {
      window.tamizhi.off('tray:navigate');
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isOnboarding && address && <Sidebar />}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/onboarding" element={
                <AnimatedRoute><OnboardingPage /></AnimatedRoute>
              } />
              <Route path="/wallet" element={
                <AuthGuard>
                  <AnimatedRoute><WalletPage /></AnimatedRoute>
                </AuthGuard>
              } />
              <Route path="/messenger" element={
                <AuthGuard>
                  <AnimatedRoute><MessengerPage /></AnimatedRoute>
                </AuthGuard>
              } />
              <Route path="/literature" element={
                <AuthGuard>
                  <AnimatedRoute><LiteraturePage /></AnimatedRoute>
                </AuthGuard>
              } />
              <Route path="/explorer" element={
                <AuthGuard>
                  <AnimatedRoute><ExplorerPage /></AnimatedRoute>
                </AuthGuard>
              } />
              <Route path="/ai" element={
                <AuthGuard>
                  <AnimatedRoute><AIPage /></AnimatedRoute>
                </AuthGuard>
              } />
              <Route path="/settings" element={
                <AuthGuard>
                  <AnimatedRoute><SettingsPage /></AnimatedRoute>
                </AuthGuard>
              } />
              <Route path="*" element={
                isLoaded && !address
                  ? <Navigate to="/onboarding" replace />
                  : <Navigate to="/wallet" replace />
              } />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MemoryRouter initialEntries={['/wallet']} initialIndex={0}>
      <AppShell />
    </MemoryRouter>
  );
}
