import React, { useState } from 'react';
import { useBrowser } from '../store/useBrowser';
import { t, setLang } from '../i18n';

const ENGINES = ['google', 'bing', 'duckduckgo', 'ecosia', 'brave'] as const;
const THEMES  = ['dark', 'light', 'system'] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 'none',
        background: value ? 'var(--primary)' : 'var(--border2)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 20 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '6px 10px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: 6,
        color: 'var(--text)', fontSize: 12, width: 200,
      }}
    />
  );
}

function Select<T extends string>({ value, options, onChange }: {
  value: T; options: readonly T[]; onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        padding: '6px 10px', background: 'var(--surface2)',
        border: '1px solid var(--border)', borderRadius: 6,
        color: 'var(--text)', fontSize: 12, cursor: 'pointer',
      }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

type Section = 'general' | 'privacy' | 'ai' | 'appearance';

export default function SettingsPanel() {
  const { settings, updateSettings, setShowSettings, clearHistory } = useBrowser();
  const [section, setSection] = useState<Section>('general');
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState({ ...settings });

  function save() {
    updateSettings(local);
    setLang(local.language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const tabs: Array<{ key: Section; label: string }> = [
    { key: 'general',    label: t('general') },
    { key: 'privacy',    label: t('privacy') },
    { key: 'ai',         label: t('aiSettings') },
    { key: 'appearance', label: t('appearance') },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
    >
      <div style={{
        width: 640, maxHeight: '80vh',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t('settings')}</span>
          <button onClick={() => setShowSettings(false)} style={{ color: 'var(--text2)', fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar nav */}
          <div style={{ width: 140, background: 'var(--bg)', borderRight: '1px solid var(--border)', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSection(tab.key)}
                style={{
                  padding: '9px 12px', borderRadius: 8, textAlign: 'left',
                  fontSize: 12, fontWeight: section === tab.key ? 700 : 400,
                  color: section === tab.key ? 'var(--primary)' : 'var(--text2)',
                  background: section === tab.key ? 'var(--primary-dim)' : 'transparent',
                  transition: 'all 0.1s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {section === 'general' && (
              <>
                <Row label={t('homePage')}>
                  <TextInput value={local.homepage} onChange={(v) => setLocal((s) => ({ ...s, homepage: v }))} />
                </Row>
                <Row label={t('searchEngine')}>
                  <Select value={local.searchEngine} options={ENGINES} onChange={(v) => setLocal((s) => ({ ...s, searchEngine: v }))} />
                </Row>
                <Row label="மொழி / Language">
                  <Select value={local.language} options={['ta', 'en'] as const} onChange={(v) => setLocal((s) => ({ ...s, language: v }))} />
                </Row>
                <Row label={t('bookmarks') + ' bar'}>
                  <Toggle value={local.showBookmarksBar} onChange={(v) => setLocal((s) => ({ ...s, showBookmarksBar: v }))} />
                </Row>
              </>
            )}

            {section === 'privacy' && (
              <>
                <Row label={t('adBlock')}>
                  <Toggle value={local.adBlockEnabled} onChange={(v) => setLocal((s) => ({ ...s, adBlockEnabled: v }))} />
                </Row>
                <Row label={t('fingerprint')}>
                  <Toggle value={local.fingerprintProtection} onChange={(v) => setLocal((s) => ({ ...s, fingerprintProtection: v }))} />
                </Row>
                <Row label={t('httpsOnly')}>
                  <Toggle value={local.httpsUpgrade} onChange={(v) => setLocal((s) => ({ ...s, httpsUpgrade: v }))} />
                </Row>
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={() => { if (confirm('வரலாறை அழிக்கவா?')) clearHistory(); }}
                    style={{
                      padding: '9px 16px', background: 'rgba(255,71,87,0.15)',
                      border: '1px solid rgba(255,71,87,0.4)', borderRadius: 8,
                      color: 'var(--danger)', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {t('clearHistory')}
                  </button>
                </div>
              </>
            )}

            {section === 'ai' && (
              <>
                <Row label={t('aiApiUrl')}>
                  <TextInput value={local.aiApiUrl} onChange={(v) => setLocal((s) => ({ ...s, aiApiUrl: v }))} placeholder="https://api.openai.com/v1" />
                </Row>
                <Row label={t('aiApiKey')}>
                  <TextInput type="password" value={local.aiApiKey} onChange={(v) => setLocal((s) => ({ ...s, aiApiKey: v }))} placeholder="sk-..." />
                </Row>
                <Row label={t('aiModel')}>
                  <TextInput value={local.aiModel} onChange={(v) => setLocal((s) => ({ ...s, aiModel: v }))} placeholder="gpt-4o-mini" />
                </Row>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, lineHeight: 1.6 }}>
                  Supports OpenAI, Anthropic (via proxy), Ollama, and any OpenAI-compatible API.
                </p>
              </>
            )}

            {section === 'appearance' && (
              <>
                <Row label={t('appearance')}>
                  <Select value={local.theme} options={THEMES} onChange={(v) => setLocal((s) => ({ ...s, theme: v }))} />
                </Row>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={() => setShowSettings(false)}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={save}
            style={{
              padding: '8px 20px', borderRadius: 8,
              background: saved ? 'var(--success)' : 'var(--primary)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.3s',
            }}
          >
            {saved ? '✓ சேமிக்கப்பட்டது' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
