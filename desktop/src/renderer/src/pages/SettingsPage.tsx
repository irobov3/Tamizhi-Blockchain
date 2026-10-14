import React, { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '../store/wallet.store';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';

// MARK: - Settings sections

type Section = 'network' | 'appearance' | 'language' | 'keyring' | 'notifications' | 'about';

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'network',
    label: 'Network',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 6s4-3 11-3 11 3 11 3" /><path d="M1 12s4-3 11-3 11 3 11 3" /><path d="M1 18s4-3 11-3 11 3 11 3" /></svg>,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  },
  {
    id: 'language',
    label: 'Language',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="M22 22l-5-10-5 10" /><path d="M14 18h6" /></svg>,
  },
  {
    id: 'keyring',
    label: 'Keyring',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>,
  },
  {
    id: 'about',
    label: 'About',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  },
];

// MARK: - SettingsPage

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('network');

  return (
    <div className="flex h-full bg-navy-950">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-white/10 p-4 space-y-1">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-3 mb-3">Settings</p>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              activeSection === s.id
                ? 'bg-navy-700 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/[0.05]',
            ].join(' ')}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeSection === 'network' && <NetworkSection />}
        {activeSection === 'appearance' && <AppearanceSection />}
        {activeSection === 'language' && <LanguageSection />}
        {activeSection === 'keyring' && <KeyringSection />}
        {activeSection === 'notifications' && <NotificationsSection />}
        {activeSection === 'about' && <AboutSection />}
      </div>
    </div>
  );
};

// MARK: - Section Wrapper

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-white">{title}</h2>
    {subtitle && <p className="text-white/40 text-sm mt-1">{subtitle}</p>}
  </div>
);

const SettingCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-navy-800 border border-white/10 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

// MARK: - Network Section

const NetworkSection: React.FC = () => {
  const [rpc, setRpc] = useState(import.meta.env.VITE_RPC_URL ?? 'http://localhost:26657');
  const [lcd, setLcd] = useState(import.meta.env.VITE_LCD_URL ?? 'http://localhost:1317');
  const [ws, setWs] = useState(import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch(`${lcd}/cosmos/base/tendermint/v1beta1/node_info`);
      setTestResult(resp.ok ? 'ok' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeader title="Network" subtitle="Configure RPC and LCD endpoints" />

      <SettingCard className="space-y-4">
        <Input label="Chain RPC URL" value={rpc} onChange={(e) => setRpc(e.target.value)} />
        <Input label="Chain LCD URL" value={lcd} onChange={(e) => setLcd(e.target.value)} />
        <Input label="WebSocket URL" value={ws} onChange={(e) => setWs(e.target.value)} />

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" loading={testing} onClick={handleTest}>
            Test Connection
          </Button>
          {testResult === 'ok' && <Badge variant="success" dot>Connected</Badge>}
          {testResult === 'fail' && <Badge variant="error" dot>Failed</Badge>}
        </div>
      </SettingCard>
    </div>
  );
};

// MARK: - Appearance Section

const AppearanceSection: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeader title="Appearance" />
      <SettingCard className="space-y-4">
        <p className="text-sm text-white/60">Theme</p>
        <div className="flex gap-3">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={[
                'flex-1 py-3 rounded-xl border text-sm font-medium capitalize transition-colors',
                theme === t
                  ? 'border-saffron-500 bg-saffron-500/10 text-saffron-400'
                  : 'border-white/10 text-white/40 hover:border-white/30',
              ].join(' ')}
            >
              {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/30">Light theme coming soon</p>
      </SettingCard>
    </div>
  );
};

// MARK: - Language Section

const LanguageSection: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'ta'>('en');

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeader title="Language / மொழி" />
      <SettingCard className="space-y-4">
        {[
          { value: 'en', label: 'English', sub: 'Interface in English' },
          { value: 'ta', label: 'தமிழ்', sub: 'Interface in Tamil' },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-4 cursor-pointer">
            <input
              type="radio"
              name="language"
              value={opt.value}
              checked={lang === opt.value}
              onChange={() => setLang(opt.value as typeof lang)}
              className="accent-saffron-500 w-4 h-4"
            />
            <div>
              <p className="text-white text-sm font-medium">{opt.label}</p>
              <p className="text-white/40 text-xs">{opt.sub}</p>
            </div>
          </label>
        ))}
      </SettingCard>
    </div>
  );
};

// MARK: - Keyring Section

const KeyringSection: React.FC = () => {
  const { address } = useWalletStore();
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const revealMnemonic = async () => {
    setIsLoading(true);
    try {
      const wallet = await window.tamizhi.db.getWallet();
      setMnemonic(wallet?.encrypted_mnemonic ?? null);
      setShowMnemonic(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!mnemonic) return;
    window.tamizhi.copyToClipboard(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeader title="Keyring" subtitle="Manage your wallet keys securely" />

      {/* Current wallet */}
      <SettingCard className="space-y-3">
        <p className="text-xs text-white/40 uppercase tracking-wider">Current Wallet</p>
        <div className="bg-navy-900/50 rounded-lg p-3">
          <p className="text-sm font-mono text-white/70 break-all">{address ?? '—'}</p>
        </div>
      </SettingCard>

      {/* Mnemonic */}
      <SettingCard className="space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm font-semibold text-amber-400">Recovery Phrase</p>
        </div>

        {!showMnemonic ? (
          <div className="space-y-3">
            <p className="text-sm text-white/50">
              Your recovery phrase gives full access to your wallet. Never share it.
            </p>
            <Button variant="secondary" size="sm" loading={isLoading} onClick={revealMnemonic}>
              Click to reveal
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="relative"
              onMouseLeave={() => setShowMnemonic(false)}
            >
              <div
                className="bg-navy-900/80 border border-amber-700/40 rounded-xl p-4 font-mono text-sm text-white/80 leading-relaxed select-all"
                style={{ filter: showMnemonic ? 'none' : 'blur(8px)' }}
              >
                {mnemonic ?? 'Loading…'}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowMnemonic(false)}>
                Hide
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!mnemonic) return;
                  const blob = new Blob([mnemonic], { type: 'text/plain' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'tamizhi-wallet-backup.txt';
                  a.click();
                }}
              >
                Export Backup
              </Button>
            </div>
          </div>
        )}
      </SettingCard>
    </div>
  );
};

// MARK: - Notifications Section

const NotificationsSection: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [newMsg, setNewMsg] = useState(true);
  const [txAlert, setTxAlert] = useState(true);
  const [updates, setUpdates] = useState(false);

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeader title="Notifications" />
      <SettingCard className="space-y-4">
        {[
          { label: 'Enable notifications', value: enabled, set: setEnabled },
          { label: 'New messages', value: newMsg, set: setNewMsg },
          { label: 'Transaction alerts', value: txAlert, set: setTxAlert },
          { label: 'App updates', value: updates, set: setUpdates },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-white/70">{item.label}</span>
            <button
              onClick={() => item.set((v) => !v)}
              className={[
                'w-11 h-6 rounded-full transition-colors relative',
                item.value ? 'bg-saffron-500' : 'bg-white/20',
              ].join(' ')}
            >
              <div
                className={[
                  'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                  item.value ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
          </div>
        ))}
      </SettingCard>
    </div>
  );
};

// MARK: - About Section

const AboutSection: React.FC = () => {
  const [version, setVersion] = useState('—');

  useEffect(() => {
    window.tamizhi.getVersion().then(setVersion);
  }, []);

  const links = [
    { label: 'GitHub', url: 'https://github.com/tamizhi-ai' },
    { label: 'Documentation', url: 'https://docs.tamizhi.ai' },
    { label: 'Block Explorer', url: 'https://explorer.tamizhi.ai' },
  ];

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeader title="About Tamizhi" />

      <SettingCard className="space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #E8500A, #F5C518)' }}
          >
            <span className="text-3xl font-bold text-navy-900">த</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg">தமிழி · Tamizhi</p>
            <p className="text-white/40 text-sm">Tamil Digital Sovereignty Platform</p>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        <div className="space-y-2">
          {[
            ['Version', version],
            ['Chain ID', import.meta.env.VITE_CHAIN_ID ?? 'tamizhi-1'],
            ['Build Date', new Date().toLocaleDateString()],
            ['Node.js', process.versions.node ?? '—'],
            ['Electron', process.versions.electron ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-white/40">{label}</span>
              <span className="text-white/70 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </SettingCard>

      <SettingCard className="space-y-3">
        <p className="text-xs text-white/40 uppercase tracking-wider">Links</p>
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => window.tamizhi.openExternal(link.url)}
            className="w-full flex items-center justify-between text-sm text-white/70 hover:text-saffron-400 transition-colors py-1"
          >
            <span>{link.label}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        ))}
      </SettingCard>
    </div>
  );
};

export default SettingsPage;
