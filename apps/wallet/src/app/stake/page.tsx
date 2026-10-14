'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import TxStatus, { type TxState } from '@/components/TxStatus';
import { getValidators, getDelegations, getRewards, formatTMZ, type Validator, type Delegation } from '@/lib/api';
import { delegate, claimRewards } from '@/lib/keplr';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://explorer.tamizhi.ai';
const TMZ_FACTOR = 1_000_000;

function commissionPct(rate: string): string {
  return `${(parseFloat(rate) * 100).toFixed(1)}%`;
}

function tokensToTMZ(tokens: string): string {
  const n = parseInt(tokens, 10);
  if (isNaN(n)) return '—';
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}T TMZ`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B TMZ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M TMZ`;
  return formatTMZ(tokens);
}

// ─── Delegate Modal ───────────────────────────────────────────────────────────

interface DelegateModalProps {
  validator: Validator;
  delegatorAddress: string;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
}

function DelegateModal({ validator, delegatorAddress, onClose, onSuccess }: DelegateModalProps) {
  const [amount, setAmount] = useState('');
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });

  async function handleDelegate(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    setTxState({ status: 'pending' });
    try {
      const utmz = String(Math.floor(val * TMZ_FACTOR));
      const hash = await delegate(delegatorAddress, validator.operator_address, utmz);
      setTxState({ status: 'success', txHash: hash });
      onSuccess(hash);
    } catch (err: any) {
      setTxState({ status: 'error', message: err?.message ?? 'Delegation failed' });
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={modalTitle}>Delegate TMZ</h3>
        <p style={modalSubtitle}>
          Validator: <strong style={{ color: '#d4a017' }}>{validator.description.moniker}</strong>
        </p>
        <p style={modalSubtitle}>
          Commission: {commissionPct(validator.commission.commission_rates.rate)}
        </p>
        <form onSubmit={handleDelegate}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle} htmlFor="del-amount">Amount (TMZ)</label>
            <input
              id="del-amount"
              style={inputStyle}
              type="number"
              placeholder="0.000000"
              min="0"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          {amount && !isNaN(parseFloat(amount)) && (
            <div style={{ fontSize: '12px', color: 'rgba(253,246,227,0.45)', marginBottom: '14px' }}>
              = {String(Math.floor(parseFloat(amount) * TMZ_FACTOR))} utmz
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" style={cancelBtn} onClick={onClose}>Cancel</button>
            <button
              type="submit"
              style={{ ...confirmBtn, ...(txState.status === 'pending' ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
              disabled={txState.status === 'pending'}
            >
              {txState.status === 'pending' ? 'Delegating…' : 'Confirm Delegate'}
            </button>
          </div>
          <TxStatus state={txState} explorerUrl={EXPLORER} />
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StakePage() {
  const { address, isConnected, refresh } = useWallet();

  const [validators, setValidators] = useState<Validator[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [pendingRewards, setPendingRewards] = useState('0');
  const [loading, setLoading] = useState(true);
  const [claimTxState, setClaimTxState] = useState<TxState>({ status: 'idle' });
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getValidators(),
        address ? getDelegations(address) : Promise.resolve([]),
        address ? getRewards(address) : Promise.resolve('0'),
      ]);
      if (results[0].status === 'fulfilled') setValidators(results[0].value);
      if (results[1].status === 'fulfilled') setDelegations(results[1].value as Delegation[]);
      if (results[2].status === 'fulfilled') setPendingRewards(results[2].value as string);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const delegationMap = Object.fromEntries(
    delegations.map((d) => [d.delegation.validator_address, d]),
  );

  return (
    <div>
      {selectedValidator && address && (
        <DelegateModal
          validator={selectedValidator}
          delegatorAddress={address}
          onClose={() => setSelectedValidator(null)}
          onSuccess={async () => {
            setSelectedValidator(null);
            await loadData();
            await refresh();
          }}
        />
      )}

      <div style={pageHeader}>
        <h1 style={h1}>Staking</h1>
        <p style={subtitle}>Delegate TMZ to validators and earn staking rewards.</p>
      </div>

      {/* Current delegations */}
      {isConnected && (
        <section style={section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={h2}>Your Delegations</h2>
            {delegations.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', color: '#d4a017' }}>
                  Pending: <strong>{formatTMZ(pendingRewards)}</strong>
                </span>
                <button
                  style={{ ...claimBtn, ...(claimTxState.status === 'pending' ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                  onClick={handleClaimAll}
                  disabled={claimTxState.status === 'pending'}
                >
                  {claimTxState.status === 'pending' ? 'Claiming…' : 'Claim All Rewards'}
                </button>
              </div>
            )}
          </div>
          <TxStatus state={claimTxState} explorerUrl={EXPLORER} />
          {!loading && delegations.length === 0 ? (
            <div style={emptyBox}>No active delegations. Delegate to a validator below.</div>
          ) : loading ? (
            <div style={emptyBox}>Loading delegations…</div>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    {['Validator', 'Delegated', 'Commission'].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {delegations.map((del, i) => {
                    const valAddr = del.delegation.validator_address;
                    const val = validators.find((v) => v.operator_address === valAddr);
                    return (
                      <tr key={valAddr} style={i % 2 === 0 ? rowEven : {}}>
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{val?.description.moniker ?? 'Unknown'}</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(253,246,227,0.4)', marginTop: '2px' }}>
                            {valAddr.slice(0, 24)}…
                          </div>
                        </td>
                        <td style={{ ...td, color: '#d4a017', fontWeight: 600 }}>
                          {formatTMZ(del.balance.amount)}
                        </td>
                        <td style={td}>
                          {val ? commissionPct(val.commission.commission_rates.rate) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Validators table */}
      <section style={section}>
        <h2 style={h2}>Active Validators</h2>
        {loading ? (
          <div style={emptyBox}>Loading validators…</div>
        ) : validators.length === 0 ? (
          <div style={emptyBox}>No active validators found.</div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  {['Validator', 'Voting Power', 'Commission', 'My Stake', 'Action'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validators.map((val, i) => {
                  const myDel = delegationMap[val.operator_address];
                  return (
                    <tr key={val.operator_address} style={i % 2 === 0 ? rowEven : {}}>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{val.description.moniker}</div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(253,246,227,0.4)', marginTop: '2px' }}>
                          {val.operator_address.slice(0, 22)}…
                        </div>
                      </td>
                      <td style={{ ...td, color: '#00d4ff' }}>{tokensToTMZ(val.tokens)}</td>
                      <td style={td}>{commissionPct(val.commission.commission_rates.rate)}</td>
                      <td style={{ ...td, color: '#d4a017' }}>
                        {myDel ? formatTMZ(myDel.balance.amount) : '—'}
                      </td>
                      <td style={td}>
                        {isConnected ? (
                          <button
                            style={delegateBtn}
                            onClick={() => setSelectedValidator(val)}
                          >
                            Delegate
                          </button>
                        ) : (
                          <span style={{ color: 'rgba(253,246,227,0.3)', fontSize: '13px' }}>Connect wallet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageHeader: React.CSSProperties = { marginBottom: '28px' };
const h1: React.CSSProperties = { margin: 0, fontSize: '28px', fontWeight: 700, color: '#fdf6e3', letterSpacing: '-0.02em' };
const subtitle: React.CSSProperties = { margin: '6px 0 0', fontSize: '14px', color: 'rgba(253,246,227,0.5)' };
const section: React.CSSProperties = { marginBottom: '36px' };
const h2: React.CSSProperties = { margin: '0 0 14px', fontSize: '17px', fontWeight: 600, color: '#fdf6e3' };

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

const claimBtn: React.CSSProperties = {
  padding: '8px 18px',
  background: 'linear-gradient(135deg, #d4a017, #b8870e)',
  border: 'none',
  borderRadius: '7px',
  color: '#0e0824',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const delegateBtn: React.CSSProperties = {
  padding: '6px 14px',
  background: 'rgba(0,212,255,0.1)',
  border: '1px solid rgba(0,212,255,0.3)',
  borderRadius: '6px',
  color: '#00d4ff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

// Modal styles
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 999,
};

const modalBox: React.CSSProperties = {
  background: '#1a1040',
  border: '1px solid rgba(42,31,92,0.9)',
  borderRadius: '14px',
  padding: '28px',
  maxWidth: '400px',
  width: '90%',
};

const modalTitle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '18px',
  fontWeight: 700,
  color: '#fdf6e3',
};

const modalSubtitle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '13px',
  color: 'rgba(253,246,227,0.55)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'rgba(253,246,227,0.7)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(42,31,92,0.8)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: '#fdf6e3',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
};

const cancelBtn: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  background: 'transparent',
  border: '1px solid rgba(42,31,92,0.8)',
  borderRadius: '8px',
  color: 'rgba(253,246,227,0.6)',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '14px',
};

const confirmBtn: React.CSSProperties = {
  flex: 2,
  padding: '10px',
  background: 'linear-gradient(135deg, #d4a017, #b8870e)',
  border: 'none',
  borderRadius: '8px',
  color: '#0e0824',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '14px',
};
