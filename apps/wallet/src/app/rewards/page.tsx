'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import TxStatus, { type TxState } from '@/components/TxStatus';
import { getValidators, getDelegations, getRewards, formatTMZ, type Validator, type Delegation } from '@/lib/api';
import { claimRewards } from '@/lib/keplr';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://explorer.tamizhi.ai';

// Mock rewards history (real txs would require indexer query)
const MOCK_HISTORY = [
  { type: 'Staking Reward', amount: '1250000', date: new Date(Date.now() - 86400000).toISOString() },
  { type: 'Staking Reward', amount: '980000', date: new Date(Date.now() - 172800000).toISOString() },
  { type: 'Staking Reward', amount: '1100000', date: new Date(Date.now() - 259200000).toISOString() },
];

function formatDate(ts: string): string {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function commissionPct(rate: string): string {
  return `${(parseFloat(rate) * 100).toFixed(1)}%`;
}

export default function RewardsPage() {
  const { address, isConnected, refresh } = useWallet();

  const [validators, setValidators] = useState<Validator[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [totalRewards, setTotalRewards] = useState('0');
  const [loading, setLoading] = useState(false);
  const [claimTxState, setClaimTxState] = useState<TxState>({ status: 'idle' });

  const loadData = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [valRes, delRes, rwdRes] = await Promise.allSettled([
        getValidators(),
        getDelegations(address),
        getRewards(address),
      ]);
      if (valRes.status === 'fulfilled') setValidators(valRes.value);
      if (delRes.status === 'fulfilled') setDelegations(delRes.value);
      if (rwdRes.status === 'fulfilled') setTotalRewards(rwdRes.value);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { loadData(); }, [loadData]);

  const validatorMap = Object.fromEntries(validators.map((v) => [v.operator_address, v]));

  async function handleClaimAll() {
    if (!address || delegations.length === 0) return;
    const valAddrs = delegations.map((d) => d.delegation.validator_address);
    setClaimTxState({ status: 'pending' });
    try {
      const hash = await claimRewards(address, valAddrs);
      setClaimTxState({ status: 'success', txHash: hash });
      await loadData();
      await refresh();
    } catch (err: any) {
      setClaimTxState({ status: 'error', message: err?.message ?? 'Claim failed' });
    }
  }

  return (
    <div>
      <div style={pageHeader}>
        <h1 style={h1}>Rewards</h1>
        <p style={subtitle}>View and claim your staking rewards.</p>
      </div>

      {!isConnected ? (
        <div style={emptyBox}>Connect your wallet to view staking rewards.</div>
      ) : (
        <>
          {/* Total rewards banner */}
          <div style={rewardBanner}>
            <div>
              <div style={bannerLabel}>Total Pending Rewards</div>
              <div style={bannerAmount}>{formatTMZ(totalRewards)}</div>
              <div style={bannerSub}>{delegations.length} active delegation{delegations.length !== 1 ? 's' : ''}</div>
            </div>
            <div>
              <button
                style={{
                  ...claimBtn,
                  ...(claimTxState.status === 'pending' || delegations.length === 0
                    ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                }}
                onClick={handleClaimAll}
                disabled={claimTxState.status === 'pending' || delegations.length === 0}
              >
                {claimTxState.status === 'pending' ? 'Claiming…' : 'Claim All Rewards'}
              </button>
            </div>
          </div>

          <TxStatus state={claimTxState} explorerUrl={EXPLORER} />

          {/* Per-validator breakdown */}
          <section style={section}>
            <h2 style={h2}>Per-Validator Breakdown</h2>
            {loading ? (
              <div style={emptyBox}>Loading…</div>
            ) : delegations.length === 0 ? (
              <div style={emptyBox}>No delegations found. Stake TMZ to start earning rewards.</div>
            ) : (
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      {['Validator', 'Commission', 'Delegated', 'Est. Rewards'].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {delegations.map((del, i) => {
                      const valAddr = del.delegation.validator_address;
                      const val = validatorMap[valAddr];
                      const share = parseInt(del.balance.amount, 10) /
                        delegations.reduce((sum, d) => sum + parseInt(d.balance.amount, 10), 0);
                      const estRewards = Math.floor(parseInt(totalRewards, 10) * share);
                      return (
                        <tr key={valAddr} style={i % 2 === 0 ? rowEven : {}}>
                          <td style={td}>
                            <div style={{ fontWeight: 600 }}>{val?.description.moniker ?? 'Unknown'}</div>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(253,246,227,0.35)', marginTop: '2px' }}>
                              {valAddr.slice(0, 24)}…
                            </div>
                          </td>
                          <td style={td}>
                            {val ? commissionPct(val.commission.commission_rates.rate) : '—'}
                          </td>
                          <td style={{ ...td, color: '#d4a017', fontWeight: 600 }}>
                            {formatTMZ(del.balance.amount)}
                          </td>
                          <td style={{ ...td, color: '#4caf50', fontWeight: 600 }}>
                            ~{formatTMZ(estRewards)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Rewards history (mock) */}
          <section style={section}>
            <h2 style={h2}>Rewards History</h2>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    {['Type', 'Amount', 'Date'].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_HISTORY.map((r, i) => (
                    <tr key={i} style={i % 2 === 0 ? rowEven : {}}>
                      <td style={td}>{r.type}</td>
                      <td style={{ ...td, color: '#4caf50', fontWeight: 600 }}>{formatTMZ(r.amount)}</td>
                      <td style={{ ...td, fontSize: '12px', color: 'rgba(253,246,227,0.5)' }}>{formatDate(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(253,246,227,0.3)', textAlign: 'center' }}>
              Full history requires a chain indexer.
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageHeader: React.CSSProperties = { marginBottom: '28px' };
const h1: React.CSSProperties = { margin: 0, fontSize: '28px', fontWeight: 700, color: '#fdf6e3', letterSpacing: '-0.02em' };
const subtitle: React.CSSProperties = { margin: '6px 0 0', fontSize: '14px', color: 'rgba(253,246,227,0.5)' };
const section: React.CSSProperties = { marginBottom: '32px' };
const h2: React.CSSProperties = { margin: '0 0 14px', fontSize: '17px', fontWeight: 600, color: '#fdf6e3' };

const rewardBanner: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '20px',
  background: 'linear-gradient(135deg, rgba(76,175,80,0.12), rgba(212,160,23,0.08))',
  border: '1px solid rgba(76,175,80,0.25)',
  borderRadius: '14px',
  padding: '24px 28px',
  marginBottom: '24px',
};

const bannerLabel: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(253,246,227,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '4px',
};

const bannerAmount: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 800,
  color: '#4caf50',
  letterSpacing: '-0.02em',
};

const bannerSub: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgba(253,246,227,0.45)',
  marginTop: '4px',
};

const claimBtn: React.CSSProperties = {
  padding: '11px 22px',
  background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const emptyBox: React.CSSProperties = {
  padding: '32px',
  textAlign: 'center',
  color: 'rgba(253,246,227,0.4)',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '10px',
  border: '1px dashed rgba(42,31,92,0.8)',
  fontSize: '14px',
};

const tableWrap: React.CSSProperties = {
  overflowX: 'auto',
  borderRadius: '10px',
  border: '1px solid rgba(42,31,92,0.8)',
};

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };

const th: React.CSSProperties = {
  padding: '11px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(253,246,227,0.45)',
  background: 'rgba(42,31,92,0.35)',
  borderBottom: '1px solid rgba(42,31,92,0.6)',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '13px 16px',
  color: '#fdf6e3',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
};

const rowEven: React.CSSProperties = { background: 'rgba(255,255,255,0.015)' };
