import { useState } from "react";
import { useNetwork, NETWORKS } from "../store/network";
import { useWallet } from "../store/wallet";
import {
  createWallet,
  deleteWallet,
  exportMnemonic,
  generateMnemonic,
  renameWallet,
} from "../wallet/keystore";
import { useToast } from "../components/Toast";

const C = {
  bg:      '#0e0824',
  card:    '#1a1040',
  border:  '#2a1f5c',
  gold:    '#d4a017',
  text:    '#fdf6e3',
  muted:   '#8a8aa0',
  success: '#00c48c',
  error:   '#ff4d4d',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '10px 12px',
  color: C.text,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: C.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  marginBottom: 6,
  fontWeight: 500,
}

function SectionCard({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 16,
      }}
    >
      <h3
        style={{
          color: C.gold,
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          margin: '0 0 16px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  )
}

export function Settings() {
  const { current, setNetwork, setCustom } = useNetwork();
  const { wallets, refresh, setActive, active, unlock } = useWallet();
  const push = useToast((s) => s.push);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonicRevealed, setMnemonicRevealed] = useState(false);

  // Create wallet
  const [newName, setNewName] = useState("Main");
  const [newPassword, setNewPassword] = useState("");
  const [newMnemonic, setNewMnemonic] = useState("");

  // Import
  const [impName, setImpName] = useState("Imported");
  const [impMnemonic, setImpMnemonic] = useState("");
  const [impPassword, setImpPassword] = useState("");

  // Backup
  const [bakPassword, setBakPassword] = useState("");
  const [bakResult, setBakResult] = useState<string | null>(null);

  // Network
  const [rpcInput, setRpcInput] = useState(current.rpc);
  const [restInput, setRestInput] = useState(current.rest);
  const [connStatus, setConnStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  // Security
  const [autoLock, setAutoLock] = useState("15");
  const [language, setLanguage] = useState<'en' | 'ta'>('en');

  async function handleCreate() {
    try {
      const m = newMnemonic.trim() || (await generateMnemonic(24));
      setNewMnemonic(m);
      const w = await createWallet({ name: newName, mnemonic: m, password: newPassword });
      push("success", `Wallet "${w.name}" created`);
      await refresh();
      setShowCreate(false);
      setNewMnemonic(""); setNewPassword("");
    } catch (err: any) {
      push("error", err?.message ?? "Create failed");
    }
  }

  async function handleImport() {
    try {
      const w = await createWallet({ name: impName, mnemonic: impMnemonic, password: impPassword });
      push("success", `Wallet "${w.name}" imported`);
      await refresh();
      setShowImport(false);
      setImpMnemonic(""); setImpPassword("");
    } catch (err: any) {
      push("error", err?.message ?? "Import failed");
    }
  }

  async function handleBackup() {
    if (!active) return;
    try {
      const m = await exportMnemonic(active.id, bakPassword);
      setBakResult(m);
    } catch {
      push("error", "Wrong password");
    }
  }

  async function testConnection() {
    setConnStatus('idle');
    try {
      const res = await fetch(`${restInput}/cosmos/base/tendermint/v1beta1/node_info`, { signal: AbortSignal.timeout(5000) });
      setConnStatus(res.ok ? 'ok' : 'fail');
    } catch {
      setConnStatus('fail');
    }
  }

  function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!open) return null;
    return (
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            background: '#13092e', border: `1px solid ${C.gold}40`,
            borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: C.gold, fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>

      {/* 1. Wallet Management */}
      <SectionCard title="Wallet" icon="🗝️">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: C.muted }}>{wallets.length} wallet{wallets.length !== 1 ? 's' : ''} configured</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: '7px 16px', borderRadius: 8, background: C.gold,
                color: '#1a1040', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer',
              }}
            >
              + Create
            </button>
            <button
              onClick={() => setShowImport(true)}
              style={{
                padding: '7px 16px', borderRadius: 8, background: 'transparent',
                border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, cursor: 'pointer',
              }}
            >
              Import
            </button>
          </div>
        </div>

        {wallets.length === 0 && (
          <p style={{ color: C.muted, fontSize: 13 }}>No wallets yet — create or import one.</p>
        )}

        {wallets.map((w) => (
          <div
            key={w.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: `1px solid ${C.border}40`,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <input
                defaultValue={w.name}
                onBlur={async (e) => {
                  if (e.target.value && e.target.value !== w.name) {
                    await renameWallet(w.id, e.target.value);
                    refresh();
                  }
                }}
                style={{
                  background: 'transparent', border: 'none', borderBottom: `1px solid transparent`,
                  color: C.text, fontWeight: 600, fontSize: 13, outline: 'none',
                }}
              />
              <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', marginTop: 2 }}>{w.address}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {active?.id === w.id ? (
                <span style={{ fontSize: 11, color: C.gold, padding: '4px 8px', border: `1px solid ${C.gold}40`, borderRadius: 20 }}>Active</span>
              ) : (
                <button
                  onClick={() => setActive(w.id)}
                  style={{ fontSize: 11, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                >
                  Use
                </button>
              )}
              <button
                onClick={() => { setShowBackup(true); setBakResult(null); setBakPassword(""); }}
                style={{ fontSize: 11, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
              >
                Backup
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Delete wallet "${w.name}"? This cannot be undone.`)) {
                    await deleteWallet(w.id);
                    refresh();
                    push("success", "Wallet deleted");
                  }
                }}
                style={{ fontSize: 11, background: 'transparent', border: `1px solid ${C.error}40`, color: C.error, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Mnemonic / Reset */}
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowMnemonic(true)}
            style={{
              padding: '8px 16px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${C.gold}40`, color: C.gold, fontSize: 12, cursor: 'pointer',
            }}
          >
            🔑 Show Mnemonic
          </button>
          <button
            style={{
              padding: '8px 16px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${C.muted}40`, color: C.muted, fontSize: 12, cursor: 'not-allowed', opacity: 0.5,
            }}
            disabled
            title="Coming soon"
          >
            Export Private Key (coming soon)
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            style={{
              padding: '8px 16px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${C.error}50`, color: C.error, fontSize: 12, cursor: 'pointer',
            }}
          >
            Reset Wallet
          </button>
        </div>
      </SectionCard>

      {/* 2. Network */}
      <SectionCard title="Network" icon="🌐">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {Object.values(NETWORKS).map((n) => (
            <button
              key={n.id}
              onClick={() => { setNetwork(n.id); setRpcInput(n.rpc); setRestInput(n.rest); }}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${current.id === n.id ? C.gold : C.border}`,
                background: current.id === n.id ? `${C.gold}20` : 'transparent',
                color: current.id === n.id ? C.gold : C.muted,
                cursor: 'pointer',
              }}
            >
              {n.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={LABEL_STYLE}>RPC URL</label>
            <input
              style={INPUT_STYLE}
              value={rpcInput}
              onChange={(e) => setRpcInput(e.target.value)}
              onBlur={() => setCustom({ ...current, id: 'custom', label: 'Custom', rpc: rpcInput })}
              placeholder="https://rpc.tamizhi.ai"
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>REST URL</label>
            <input
              style={INPUT_STYLE}
              value={restInput}
              onChange={(e) => setRestInput(e.target.value)}
              onBlur={() => setCustom({ ...current, id: 'custom', label: 'Custom', rest: restInput })}
              placeholder="https://api.tamizhi.ai"
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={testConnection}
            style={{
              padding: '8px 16px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, cursor: 'pointer',
            }}
          >
            Test Connection
          </button>
          {connStatus === 'ok' && <span style={{ color: C.success, fontSize: 13 }}>✓ Connected</span>}
          {connStatus === 'fail' && <span style={{ color: C.error, fontSize: 13 }}>✗ Failed</span>}
        </div>
      </SectionCard>

      {/* 3. Security */}
      <SectionCard title="Security" icon="🛡️">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Auto-lock Timer</label>
            <select
              style={{ ...INPUT_STYLE, fontFamily: 'inherit' }}
              value={autoLock}
              onChange={(e) => setAutoLock(e.target.value)}
            >
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="60">1 hour</option>
              <option value="0">Never</option>
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Language</label>
            <select
              style={{ ...INPUT_STYLE, fontFamily: 'inherit' }}
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ta')}
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Biometric lock:</span>
          <span style={{ fontSize: 11, color: `${C.muted}60`, border: `1px solid ${C.border}`, borderRadius: 20, padding: '2px 10px' }}>
            Coming soon
          </span>
        </div>
      </SectionCard>

      {/* 4. About */}
      <SectionCard title="About" icon="ℹ️">
        {[
          ['Version', '0.1.0'],
          ['Chain', 'Tamizhi Testnet'],
          ['Chain ID', current.chainId],
          ['Built with', 'Tauri 2 + React + CosmJS'],
          ['Denom', `${current.denom} (1 TMZ = 1,000,000 ${current.denom})`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '7px 0', borderBottom: `1px solid ${C.border}30`, fontSize: 12,
            }}
          >
            <span style={{ color: C.muted }}>{label}</span>
            <span style={{ color: C.text, fontFamily: label === 'Chain ID' ? 'monospace' : 'inherit' }}>{value}</span>
          </div>
        ))}
      </SectionCard>

      {/* ── Modals ── */}

      {/* Create wallet modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Wallet">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Wallet Name</label>
            <input style={INPUT_STYLE} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Main" />
          </div>
          <div>
            <label style={LABEL_STYLE}>Password</label>
            <input type="password" style={INPUT_STYLE} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Strong password" />
          </div>
          <button
            onClick={async () => setNewMnemonic(await generateMnemonic(24))}
            style={{
              padding: '8px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, cursor: 'pointer',
            }}
          >
            Generate 24-word mnemonic
          </button>
          {newMnemonic && (
            <div
              style={{
                padding: '12px', background: C.bg, border: `1px solid ${C.gold}30`,
                borderRadius: 8, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-word',
                color: C.text, lineHeight: 1.8, userSelect: 'text',
              }}
            >
              {newMnemonic}
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={!newName || !newPassword}
            style={{
              padding: '11px', borderRadius: 8, background: C.gold,
              color: '#1a1040', fontWeight: 700, fontSize: 14, border: 'none',
              cursor: !newName || !newPassword ? 'not-allowed' : 'pointer',
              opacity: !newName || !newPassword ? 0.6 : 1,
            }}
          >
            Create Wallet
          </button>
        </div>
      </Modal>

      {/* Import wallet modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Wallet">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Wallet Name</label>
            <input style={INPUT_STYLE} value={impName} onChange={(e) => setImpName(e.target.value)} placeholder="Imported" />
          </div>
          <div>
            <label style={LABEL_STYLE}>Mnemonic (12 or 24 words)</label>
            <textarea
              style={{ ...INPUT_STYLE, fontFamily: 'monospace', minHeight: 90, resize: 'vertical' }}
              value={impMnemonic}
              onChange={(e) => setImpMnemonic(e.target.value)}
              placeholder="word1 word2 word3 ... word24"
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Password (encrypts on disk)</label>
            <input type="password" style={INPUT_STYLE} value={impPassword} onChange={(e) => setImpPassword(e.target.value)} placeholder="Strong password" />
          </div>
          <button
            onClick={handleImport}
            disabled={!impMnemonic || !impPassword}
            style={{
              padding: '11px', borderRadius: 8, background: C.gold,
              color: '#1a1040', fontWeight: 700, fontSize: 14, border: 'none',
              cursor: !impMnemonic || !impPassword ? 'not-allowed' : 'pointer',
              opacity: !impMnemonic || !impPassword ? 0.6 : 1,
            }}
          >
            Import Wallet
          </button>
        </div>
      </Modal>

      {/* Backup modal */}
      <Modal
        open={showBackup}
        onClose={() => { setShowBackup(false); setBakResult(null); setBakPassword(""); }}
        title="Backup Mnemonic"
      >
        <div style={{ marginBottom: 12, padding: '10px 14px', background: `${C.error}10`, border: `1px solid ${C.error}30`, borderRadius: 8, fontSize: 12, color: C.error }}>
          ⚠️ Never share your mnemonic with anyone. Store it securely offline.
        </div>
        {!bakResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Wallet Password</label>
              <input type="password" style={INPUT_STYLE} value={bakPassword} onChange={(e) => setBakPassword(e.target.value)} placeholder="Enter password to reveal" />
            </div>
            <button
              onClick={handleBackup}
              disabled={!bakPassword}
              style={{
                padding: '11px', borderRadius: 8, background: C.gold,
                color: '#1a1040', fontWeight: 700, fontSize: 14, border: 'none',
                cursor: !bakPassword ? 'not-allowed' : 'pointer', opacity: !bakPassword ? 0.6 : 1,
              }}
            >
              Reveal Mnemonic
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '14px', background: C.bg, border: `1px solid ${C.gold}30`,
              borderRadius: 8, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-word',
              color: C.text, lineHeight: 2, userSelect: 'text',
            }}
          >
            {bakResult}
          </div>
        )}
      </Modal>

      {/* Show mnemonic modal */}
      <Modal open={showMnemonic} onClose={() => { setShowMnemonic(false); setMnemonicRevealed(false); setBakPassword(""); setBakResult(null); }} title="🔑 Show Mnemonic">
        {!mnemonicRevealed ? (
          <div>
            <div style={{ marginBottom: 12, padding: '10px 14px', background: `${C.error}10`, border: `1px solid ${C.error}30`, borderRadius: 8, fontSize: 12, color: C.error }}>
              ⚠️ Your mnemonic phrase gives full access to your wallet. Never share it.
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Password</label>
              <input type="password" style={INPUT_STYLE} value={bakPassword} onChange={(e) => setBakPassword(e.target.value)} placeholder="Wallet password" />
            </div>
            <button
              onClick={async () => {
                if (!active) return;
                try {
                  const m = await exportMnemonic(active.id, bakPassword);
                  setBakResult(m);
                  setMnemonicRevealed(true);
                } catch {
                  push("error", "Wrong password");
                }
              }}
              disabled={!bakPassword}
              style={{
                width: '100%', padding: '11px', borderRadius: 8, background: C.gold,
                color: '#1a1040', fontWeight: 700, fontSize: 14, border: 'none',
                cursor: !bakPassword ? 'not-allowed' : 'pointer', opacity: !bakPassword ? 0.6 : 1,
              }}
            >
              Reveal
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '14px', background: C.bg, border: `1px solid ${C.gold}30`,
              borderRadius: 8, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-word',
              color: C.text, lineHeight: 2, userSelect: 'text',
            }}
          >
            {bakResult}
          </div>
        )}
      </Modal>

      {/* Reset confirmation modal */}
      <Modal open={showResetConfirm} onClose={() => setShowResetConfirm(false)} title="⚠️ Reset Wallet">
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
          This will delete all wallet data from this device. Make sure you have your mnemonic backed up. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowResetConfirm(false)}
            style={{
              flex: 1, padding: '11px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              for (const w of wallets) await deleteWallet(w.id);
              await refresh();
              setShowResetConfirm(false);
              push("success", "Wallet reset complete");
            }}
            style={{
              flex: 1, padding: '11px', borderRadius: 8, background: C.error,
              border: 'none', color: C.text, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
