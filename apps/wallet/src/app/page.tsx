'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import StatCard from '@/components/StatCard';
import {
  getTransactions,
  getDelegations,
  getRewards,
  formatTMZ,
  type TxRecord,
  type Delegation,
} from '@/lib/api';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://explorer.tamizhi.ai';

function formatDate(ts: string): string {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function StatusDot({ status }: { status: 'success' | 'failed' }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8, borderRadius: '50%',
      background: status === 'success' ? '#4caf50' : '#ef5350',
    }} />
  );
}

// ─── QR Popup ─────────────────────────────────────────────────────────────────
function QRModal({ address, onClose }: { address: string; onClose: () => void }) {
  // Use a free QR API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', color: '#fdf6e3', fontSize: '16px' }}>Receive TMZ</h3>
        <img src={qrUrl} alt="QR code" width={200} height={200} style={{ display: 'block', margin: '0 auto', borderRadius: 8 }} />
        <div style={{ marginTop: '14px', fontSize: '11px', fontFamily: 'monospace', color: 'rgba(253,246,227,0.55)', wordBreak: 'break-all', textAlign: 'center' }}>
          {address}
        </div>
        <button style={closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, balance, balanceUtmz, isConnected, connect, isLoading, refresh } = useWallet();

  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [pendingRewards, setPendingRewards] = useState('0');
  const [dataLoading, setDataLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const stakedUtmz = delegations.reduce(
    (sum, d) => sum + parseInt(d.balance.amount || '0', 10),
    0,
  );

  const loadData = useCallback(async () => {
    if (!address) return;
    setDataLoading(true);
    try {
      const [txRes, delRes, rwdRes] = await Promise.allSettled([
        getTransactions(address),
        getDelegations(address),
        getRewards(address),
      ]);
      if (txRes.status === 'fulfilled') setTxs(txRes.value.slice(0, 5));
      if (delRes.status === 'fulfilled') setDelegations(delRes.value);
      if (rwdRes.status === 'fulfilled') setPendingRewards(rwdRes.value);
    } finally {
      setDataLoading(false);
    }
  }, [address]);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh on page focus
  useEffect(() => {
    const handler = () => { refresh(); loadData(); };
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [refresh, loadData]);

  // ── Not connected CTA ──────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>
          <span style={{ fontFamily: 'var(--font-noto-tamil), sans-serif', color: '#d4a017' }}>தமிழி</span>
        </div>
        <h1 style={{ color: '#fdf6e3', fontSize: '28px', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Welcome to Tamizhi Wallet
        </h1>
        <p style={{ color: 'rgba(253,246,227,0.5)', marginBottom: '32px', fontSize: '15px' }}>
          Connect your Keplr wallet to manage TMZ, stake, and access Tamil heritage.
        </p>
        <button
          style={ctaBtn}
          onClick={connect}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting…' : 'Connect Keplr Wallet'}
        </button>
      </div>
    );
  }

  // ── Connected dashboard ────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {showQR && <QRModal address={address} onClose={() => setShowQR(false)} />}

      {/* Balance card */}
      <div style={balanceCard}>
        <div>
          <div style={balLabel}>TMZ Balance</div>
          <div style={balAmount}>{(parseInt(balanceUtmz, 10) / 1_000_000).toFixed(2)} TMZ</div>
          <div style={addrText}>{address}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/send" style={actionBtn}>Send</Link>
          <button style={{ ...actionBtn, cursor: 'pointer', border: '1.5px solid rgba(212,160,23,0.5)', background: 'transparent', color: '#d4a017', fontFamily: 'inherit' }} onClick={() => setShowQR(true)}>Receive</button>
          <Link href="/stake" style={{ ...actionBtn, background: 'rgba(0,212,255,0.12)', borderColor: 'rgba(0,212,255,0.4)', color: '#00d4ff' }}>Stake</Link>
        </div>
      </div>

      {/* Stats row */}
      <div style={statsGrid}>
        <StatCard
          icon="🔒"
          title="Staked"
          value={formatTMZ(stakedUtmz)}
          loading={dataLoading}
        />
        <StatCard
          icon="🎁"
          title="Pending Rewards"
          value={formatTMZ(pendingRewards)}
          loading={dataLoading}
        />
        <StatCard
          icon="📋"
          title="Tx Count"
          value={txs.length > 0 ? `${txs.length}+` : dataLoading ? '…' : '0'}
          loading={false}
        />
        <StatCard
          icon="🏛️"
          title="Delegations"
          value={delegations.length}
          loading={dataLoading}
        />
      </div>

      {/* Recent transactions */}
      <section style={{ marginTop: '8px' }}>
        <h2 style={sectionTitle}>Recent Transactions</h2>
        {dataLoading ? (
          <div style={emptyBox}>Loading transactions…</div>
        ) : txs.length === 0 ? (
          <div style={emptyBox}>No transactions found for this address.</div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  {['Status', 'Type', 'Amount', 'Height', 'Date'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.map((tx, i) => (
                  <tr key={tx.hash} style={i % 2 === 0 ? rowEven : rowOdd}>
                    <td style={td}><StatusDot status={tx.status} /></td>
                    <td style={td}>
                      <a
                        href={`${EXPLORER}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#00d4ff', textDecoration: 'none', fontSize: '13px' }}
                      >
                        {tx.type}
                      </a>
                    </td>
                    <td style={{ ...td, color: '#d4a017', fontWeight: 600 }}>
                      {tx.amount ? formatTMZ(tx.amount) : '—'}
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '12px' }}>{tx.height}</td>
                    <td style={{ ...td, fontSize: '12px', color: 'rgba(253,246,227,0.5)' }}>
                      {formatDate(tx.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ctaBtn: React.CSSProperties = {
  padding: '13px 32px',
  background: 'linear-gradient(135deg, #6b3fa0, #3b1f7a)',
  border: 'none',
  borderRadius: '10px',
  color: '#fff',
  fontWeight: 700,
  fontSize: '16px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const balanceCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(212,160,23,0.14), rgba(42,31,92,0.3))',
  border: '1px solid rgba(212,160,23,0.3)',
  borderRadius: '16px',
  padding: '28px 28px',
  marginBottom: '24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '20px',
};

const balLabel: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(253,246,227,0.5)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: '4px',
};

const balAmount: React.CSSProperties = {
  fontSize: '42px',
  fontWeight: 800,
  color: '#d4a017',
  letterSpacing: '-0.03em',
  lineHeight: 1.1,
};

const addrText: React.CSSProperties = {
  fontSize: '12px',
  fontFamily: 'monospace',
  color: 'rgba(253,246,227,0.45)',
  marginTop: '8px',
  wordBreak: 'break-all',
};

const actionBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '9px 20px',
  borderRadius: '8px',
  border: '1.5px solid rgba(212,160,23,0.5)',
  background: 'rgba(212,160,23,0.12)',
  color: '#d4a017',
  fontWeight: 600,
  fontSize: '14px',
  textDecoration: 'none',
};

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '14px',
  marginBottom: '28px',
};

const sectionTitle: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: '17px',
  fontWeight: 600,
  color: '#fdf6e3',
};

const emptyBox: React.CSSProperties = {
  padding: '32px',
  textAlign: 'center' as const,
  color: 'rgba(253,246,227,0.4)',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '10px',
  border: '1px dashed rgba(212,160,23,0.15)',
  fontSize: '14px',
};

const tableWrap: React.CSSProperties = {
  overflowX: 'auto',
  borderRadius: '10px',
  border: '1px solid rgba(42,31,92,0.8)',
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '14px',
};

const th: React.CSSProperties = {
  padding: '11px 16px',
  textAlign: 'left' as const,
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: 'rgba(253,246,227,0.45)',
  background: 'rgba(42,31,92,0.35)',
  borderBottom: '1px solid rgba(42,31,92,0.6)',
  whiteSpace: 'nowrap' as const,
};

const td: React.CSSProperties = {
  padding: '12px 16px',
  color: '#fdf6e3',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle' as const,
};

const rowEven: React.CSSProperties = { background: 'rgba(255,255,255,0.015)' };
const rowOdd: React.CSSProperties = { background: 'transparent' };

// Modal
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 999,
};

const modalBox: React.CSSProperties = {
  background: '#1a1040',
  border: '1px solid rgba(212,160,23,0.3)',
  borderRadius: '16px',
  padding: '28px',
  maxWidth: '320px',
  width: '90%',
  textAlign: 'center',
};

const closeBtn: React.CSSProperties = {
  marginTop: '18px',
  padding: '8px 24px',
  background: 'rgba(212,160,23,0.12)',
  border: '1px solid rgba(212,160,23,0.3)',
  borderRadius: '8px',
  color: '#d4a017',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '14px',
};
