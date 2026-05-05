'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Wallet,
  Import,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { useWalletStore } from '@/store/wallet.store';
import { generateMnemonic, isKeplrAvailable } from '@/lib/chain';
import { Spinner } from '@/components/ui/Spinner';

interface WalletConnectProps {
  onClose: () => void;
}

type View = 'choice' | 'create' | 'import';

export function WalletConnect({ onClose }: WalletConnectProps) {
  const [view, setView] = useState<View>('choice');
  const [mnemonic, setMnemonic] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const { connectWallet, connectWithKeplr } = useWalletStore();

  const handleGenerateMnemonic = async () => {
    setGenerating(true);
    setError('');
    try {
      const newMnemonic = await generateMnemonic();
      setMnemonic(newMnemonic);
      setView('create');
    } catch (err) {
      setError('Failed to generate mnemonic. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyMnemonic = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleKeplrConnect = async () => {
    setLoading(true);
    setError('');
    try {
      await connectWithKeplr();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Keplr');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (phrase: string) => {
    setLoading(true);
    setError('');
    try {
      await connectWallet(phrase.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const words = mnemonic.split(' ').filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-background-card border border-background-border rounded-2xl shadow-card-hover overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-background-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {view === 'choice' ? 'Connect Wallet' : view === 'create' ? 'New Wallet' : 'Import Wallet'}
              </h2>
              <p className="tamil-text text-primary-400 text-xs">
                {view === 'choice' ? 'நிதியிடம் இணைக்கவும்' : view === 'create' ? 'புதிய நிதியிடம்' : 'நிதியிடம் இறக்குமதி'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Choice View */}
          {view === 'choice' && (
            <div className="space-y-3">
              {/* Keplr / Leap browser extension */}
              {isKeplrAvailable() ? (
                <button
                  onClick={handleKeplrConnect}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-DEFAULT border border-primary-500/40 hover:border-primary-500/70 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500/30 transition-colors">
                    {loading ? <Spinner size="sm" /> : <Wallet className="w-5 h-5 text-primary-400" />}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Connect with Keplr</div>
                    <div className="text-primary-400/80 text-sm">Sign with your browser extension — no seed phrase needed</div>
                  </div>
                </button>
              ) : (
                <a
                  href="https://keplr.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-DEFAULT border border-background-border hover:border-primary-500/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Install Keplr</div>
                    <div className="text-text-muted text-sm">Recommended: browser extension wallet</div>
                  </div>
                </a>
              )}

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-background-border" />
                <span className="text-text-muted text-xs">or use seed phrase</span>
                <div className="flex-1 h-px bg-background-border" />
              </div>

              <button
                onClick={handleGenerateMnemonic}
                disabled={generating}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-DEFAULT border border-background-border hover:border-primary-500/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500/20 transition-colors">
                  {generating ? <Spinner size="sm" /> : <Plus className="w-5 h-5 text-primary-400" />}
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold">Create New Wallet</div>
                  <div className="text-text-muted text-sm">Generate a new 24-word seed phrase</div>
                </div>
              </button>

              <button
                onClick={() => setView('import')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-DEFAULT border border-background-border hover:border-accent/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <Import className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold">Import Existing Wallet</div>
                  <div className="text-text-muted text-sm">Enter your 12 or 24 word seed phrase</div>
                </div>
              </button>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Create Wallet View */}
          {view === 'create' && mnemonic && (
            <div className="space-y-4">
              {/* Security Warning */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-semibold text-sm mb-1">Save your seed phrase!</p>
                  <p className="text-amber-400/80 text-xs leading-relaxed">
                    Write down these 24 words in order. Anyone with these words can access your wallet.
                    Never share them with anyone. Tamizhi cannot recover your wallet.
                  </p>
                </div>
              </div>

              {/* Mnemonic Grid */}
              <div className="relative">
                <div
                  className={`grid grid-cols-3 gap-2 ${!showMnemonic ? 'filter blur-sm select-none pointer-events-none' : ''}`}
                  style={{ userSelect: showMnemonic ? 'text' : 'none' }}
                >
                  {words.map((word, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-surface-DEFAULT border border-background-border rounded-lg px-2 py-1.5"
                    >
                      <span className="text-text-muted text-xs w-5 text-right flex-shrink-0">{i + 1}.</span>
                      <span className="text-text-primary text-sm font-mono">{word}</span>
                    </div>
                  ))}
                </div>
                {!showMnemonic && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setShowMnemonic(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Reveal Seed Phrase
                    </button>
                  </div>
                )}
              </div>

              {showMnemonic && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyMnemonic}
                    className="flex items-center gap-2 flex-1 justify-center py-2 rounded-lg border border-background-border text-text-secondary hover:text-white text-sm transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy phrase'}
                  </button>
                  <button
                    onClick={handleGenerateMnemonic}
                    className="flex items-center gap-2 flex-1 justify-center py-2 rounded-lg border border-background-border text-text-secondary hover:text-white text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                </div>
              )}

              {/* Confirm checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 accent-primary-500 w-4 h-4"
                />
                <span className="text-text-secondary text-sm">
                  I have saved my seed phrase in a safe place and understand that I cannot recover it
                  if lost.
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setView('choice')}
                  className="flex-1 py-3 rounded-xl border border-background-border text-text-secondary hover:text-white text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => handleConnect(mnemonic)}
                  disabled={!confirmed || !showMnemonic || loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  {loading ? <Spinner size="sm" /> : null}
                  {loading ? 'Connecting...' : 'Access Wallet'}
                </button>
              </div>
            </div>
          )}

          {/* Import View */}
          {view === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Seed Phrase (12 or 24 words)
                </label>
                <div className="relative">
                  <textarea
                    value={importMnemonic}
                    onChange={(e) => setImportMnemonic(e.target.value)}
                    placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12..."
                    rows={4}
                    className="w-full bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors font-mono resize-none"
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="absolute right-3 top-3 text-text-muted hover:text-white transition-colors"
                  >
                    {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {importMnemonic && (
                  <p className="text-xs text-text-muted mt-1">
                    {importMnemonic.trim().split(/\s+/).length} words entered
                  </p>
                )}
              </div>

              {/* Security Warning */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs leading-relaxed">
                  Only enter your seed phrase on trusted devices. Your phrase is stored encrypted
                  locally and is never sent to any server.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setView('choice')}
                  className="flex-1 py-3 rounded-xl border border-background-border text-text-secondary hover:text-white text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => handleConnect(importMnemonic)}
                  disabled={importMnemonic.trim().split(/\s+/).length < 12 || loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  {loading ? <Spinner size="sm" /> : null}
                  {loading ? 'Importing...' : 'Import Wallet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
