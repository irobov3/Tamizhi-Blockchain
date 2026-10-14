import React, { useState, useCallback } from 'react';
import { useWalletStore } from '../store/wallet.store';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';

type Step = 'welcome' | 'create' | 'import' | 'success';

// MARK: - Onboarding Page

const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState<Step>('welcome');
  const [mnemonic, setMnemonic] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [confirmedWarning, setConfirmedWarning] = useState(false);
  const [error, setError] = useState('');

  const { createWallet, importWallet, isLoading, address } = useWalletStore();

  // MARK: - Handlers

  const handleCreate = useCallback(async () => {
    setError('');
    try {
      const result = await createWallet();
      setMnemonic(result.mnemonic);
      setStep('create');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    }
  }, [createWallet]);

  const handleImport = useCallback(async () => {
    const words = importMnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError('Please enter a valid 12 or 24 word mnemonic');
      return;
    }
    setError('');
    try {
      await importWallet(importMnemonic.trim());
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import wallet');
    }
  }, [importMnemonic, importWallet]);

  const handleContinueAfterCreate = useCallback(() => {
    if (!confirmedWarning) return;
    setStep('success');
  }, [confirmedWarning]);

  const handleGoToApp = useCallback(() => {
    // Reload — App.tsx will detect isConnected and route to main
    window.location.reload();
  }, []);

  // MARK: - Render Steps

  if (step === 'welcome') return <WelcomeStep onCreate={handleCreate} onImport={() => setStep('import')} isLoading={isLoading} error={error} />;
  if (step === 'create') return (
    <CreateStep
      mnemonic={mnemonic}
      confirmed={confirmedWarning}
      onConfirmChange={setConfirmedWarning}
      onNext={handleContinueAfterCreate}
      onBack={() => setStep('welcome')}
    />
  );
  if (step === 'import') return (
    <ImportStep
      value={importMnemonic}
      onChange={setImportMnemonic}
      onImport={handleImport}
      onBack={() => setStep('welcome')}
      isLoading={isLoading}
      error={error}
    />
  );
  return <SuccessStep address={address ?? ''} onGo={handleGoToApp} />;
};

// MARK: - Welcome Step

const WelcomeStep: React.FC<{
  onCreate: () => void;
  onImport: () => void;
  isLoading: boolean;
  error: string;
}> = ({ onCreate, onImport, isLoading, error }) => (
  <div className="min-h-screen flex items-center justify-center bg-navy-950 p-6">
    <div className="max-w-md w-full text-center space-y-10">
      {/* Logo */}
      <div className="space-y-4">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-xl"
          style={{ background: 'linear-gradient(135deg, #E8500A, #F5C518)' }}
        >
          <span className="text-5xl font-bold text-navy-900">த</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">தமிழி</h1>
          <p className="text-xl text-white/60 mt-1">Tamizhi</p>
          <p
            className="text-sm mt-3 font-medium tracking-widest uppercase"
            style={{ color: '#F5C518' }}
          >
            Tamil Digital Sovereignty
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-white/50 text-sm leading-relaxed">
        A decentralized platform for Tamil literature, encrypted messaging,
        and digital identity — powered by the Tamizhi blockchain.
      </p>

      {error && (
        <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          onClick={onCreate}
        >
          Create New Wallet
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={onImport} disabled={isLoading}>
          Import Existing Wallet
        </Button>
      </div>

      <p className="text-xs text-white/25">
        Your keys never leave this device. Fully non-custodial.
      </p>
    </div>
  </div>
);

// MARK: - Create Step (show mnemonic)

const CreateStep: React.FC<{
  mnemonic: string;
  confirmed: boolean;
  onConfirmChange: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ mnemonic, confirmed, onConfirmChange, onNext, onBack }) => {
  const words = mnemonic.split(' ');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 p-6">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Your Recovery Phrase</h2>
          <p className="text-white/50 text-sm mt-1">
            Write these 12 words down in order. Never share them.
          </p>
        </div>

        {/* Mnemonic Grid — 3 cols × 4 rows */}
        <div className="grid grid-cols-3 gap-2">
          {words.map((word, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-navy-800 border border-white/10 rounded-lg px-3 py-2.5"
            >
              <span className="text-xs text-white/30 w-5 shrink-0 font-mono">{i + 1}.</span>
              <span className="text-sm font-medium text-white font-mono">{word}</span>
            </div>
          ))}
        </div>

        {/* Copy button */}
        <Button variant="ghost" size="sm" fullWidth onClick={handleCopy}>
          {copied ? '✓ Copied!' : 'Copy all words'}
        </Button>

        {/* Security warning */}
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 space-y-3">
          <p className="text-amber-300 text-sm font-semibold flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Security Warning
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => onConfirmChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-saffron-500"
            />
            <span className="text-sm text-amber-200/80">
              I have written down my recovery phrase. I understand that losing it means permanent loss of access to my wallet.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!confirmed}
            onClick={onNext}
            className="flex-1"
          >
            I've saved it — Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

// MARK: - Import Step

const ImportStep: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onImport: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string;
}> = ({ value, onChange, onImport, onBack, isLoading, error }) => {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const isValid = wordCount === 12 || wordCount === 24;

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Import Wallet</h2>
          <p className="text-white/50 text-sm mt-1">
            Enter your 12 or 24 word recovery phrase
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            Recovery Phrase
          </label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="word1 word2 word3 … word12"
            rows={4}
            className={[
              'w-full rounded-lg bg-white/[0.07] text-white placeholder-white/25',
              'border focus:border-gold-400/60 outline-none focus:ring-1 focus:ring-gold-400/30',
              'transition-colors duration-150 p-3 text-sm font-mono resize-none',
              error ? 'border-red-500/70' : 'border-transparent',
            ].join(' ')}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex justify-between">
            {error ? (
              <p className="text-xs text-red-400">{error}</p>
            ) : (
              <span />
            )}
            <span
              className={`text-xs ${isValid ? 'text-green-400' : wordCount > 0 ? 'text-amber-400' : 'text-white/30'}`}
            >
              {wordCount} / 12 words
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!isValid || isLoading}
            loading={isLoading}
            onClick={onImport}
            className="flex-1"
          >
            Import Wallet
          </Button>
        </div>
      </div>
    </div>
  );
};

// MARK: - Success Step

const SuccessStep: React.FC<{ address: string; onGo: () => void }> = ({ address, onGo }) => (
  <div className="min-h-screen flex items-center justify-center bg-navy-950 p-6">
    <div className="max-w-md w-full text-center space-y-8">
      {/* Checkmark */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-xl"
        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
      >
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-white">உங்கள் பணப்பை தயார்!</h2>
        <p className="text-white/60">Your wallet is ready</p>

        <div className="bg-navy-800 border border-white/10 rounded-xl p-4 mt-4">
          <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Wallet Address</p>
          <p className="text-sm font-mono text-white/80 break-all">{address}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-white/40 text-sm">
          🔒 End-to-end encrypted messaging ready
        </p>
        <p className="text-white/40 text-sm">
          📚 Access to Tamil literature blockchain
        </p>
        <p className="text-white/40 text-sm">
          🤖 Tamizhi AI assistant available
        </p>
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={onGo}>
        Go to App →
      </Button>
    </div>
  </div>
);

export default OnboardingPage;
