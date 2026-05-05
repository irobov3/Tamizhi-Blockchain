'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getRewardRecords, getRewardRules, type RewardRecord, type RewardRule } from '@/lib/api';

const UTMZ_FACTOR = 1_000_000;

function formatUtmz(amount: string): string {
  const n = parseInt(amount, 10);
  if (isNaN(n)) return '0 TMZ';
  return `${(n / UTMZ_FACTOR).toFixed(4)} TMZ`;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function totalEarned(records: RewardRecord[]): string {
  const total = records.reduce((sum, r) => sum + (parseInt(r.amount, 10) || 0), 0);
  return (total / UTMZ_FACTOR).toFixed(4);
}

export default function RewardsPage() {
  const { address, isConnected } = useWallet();

  const [rules, setRules] = useState<RewardRule[]>([]);
  const [records, setRecords] = useState<RewardRecord[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRules() {
      setRulesLoading(true);
      try {
        const data = await getRewardRules();
        setRules(data);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load reward rules.');
      } finally {
        setRulesLoading(false);
      }
    }
    loadRules();
  }, []);

  useEffect(() => {
    if (!address) return;
    async function loadRecords() {
      setRecordsLoading(true);
      try {
        const data = await getRewardRecords(address!);
        const sorted = [...data].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        setRecords(sorted);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load reward records.');
      } finally {
        setRecordsLoading(false);
      }
    }
    loadRecords();
  }, [address]);

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.h1}>Rewards</h1>
        <p style={styles.subtitle}>Reward rules and your earning history on the Tamizhi chain.</p>
      </div>

      {/* Total earned banner */}
      {isConnected && records.length > 0 && (
        <div style={styles.totalBanner}>
          <span style={styles.totalLabel}>Total Earned</span>
          <span style={styles.totalValue}>{totalEarned(records)} TMZ</span>
          <span style={styles.totalCount}>{records.length} reward events</span>
        </div>
      )}

      {/* Reward Rules */}
      <section style={styles.section}>
        <h2 style={styles.h2}>Reward Rules</h2>
        {error && <div style={styles.errorBox}>{error}</div>}
        {rulesLoading ? (
          <div style={styles.loadingGrid}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={styles.ruleSkeleton} />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div style={styles.emptyState}>No reward rules found.</div>
        ) : (
          <div style={styles.rulesGrid}>
            {rules.map((rule) => (
              <div key={rule.id} style={styles.ruleCard}>
                <div style={styles.ruleHeader}>
                  <span style={styles.ruleName}>{rule.name}</span>
                  <span
                    style={{
                      ...styles.ruleBadge,
                      background: rule.active
                        ? 'rgba(76,175,80,0.18)'
                        : 'rgba(255,255,255,0.08)',
                      color: rule.active ? '#4caf50' : 'rgba(253,246,227,0.4)',
                      border: `1px solid ${rule.active ? 'rgba(76,175,80,0.35)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p style={styles.ruleDescription}>{rule.description}</p>
                <div style={styles.ruleFooter}>
                  <span style={styles.ruleAmount}>
                    +{formatUtmz(rule.amount)}
                  </span>
                  <span style={styles.ruleCondition}>{rule.condition}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reward History */}
      <section style={styles.section}>
        <h2 style={styles.h2}>Your Reward History</h2>
        {!isConnected ? (
          <div style={styles.emptyState}>Connect your wallet to view your reward history.</div>
        ) : recordsLoading ? (
          <div style={styles.emptyState}>Loading…</div>
        ) : records.length === 0 ? (
          <div style={styles.emptyState}>No reward records found for your address.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id ?? i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td style={styles.td}>
                      <code style={styles.code}>{r.id?.slice(0, 10) ?? '—'}</code>
                    </td>
                    <td style={{ ...styles.td, color: '#f5a623', fontWeight: 600 }}>
                      {formatUtmz(r.amount)}
                    </td>
                    <td style={styles.td}>{r.reason ?? '—'}</td>
                    <td style={{ ...styles.td, fontSize: '12px', color: 'rgba(253,246,227,0.55)' }}>
                      {formatTimestamp(r.timestamp)}
                    </td>
                    <td style={styles.td}>
                      {r.tx_hash ? (
                        <code style={{ ...styles.code, fontSize: '11px' }}>
                          {r.tx_hash.slice(0, 14)}…
                        </code>
                      ) : (
                        <span style={{ color: 'rgba(253,246,227,0.3)' }}>—</span>
                      )}
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

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: '28px' },
  h1: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#fdf6e3',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '14px',
    color: 'rgba(253,246,227,0.5)',
  },
  totalBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(245,166,35,0.06))',
    border: '1px solid rgba(245,166,35,0.3)',
    borderRadius: '12px',
    padding: '18px 24px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  totalLabel: {
    fontSize: '13px',
    color: 'rgba(253,246,227,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  totalValue: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#f5a623',
  },
  totalCount: {
    fontSize: '13px',
    color: 'rgba(253,246,227,0.4)',
    marginLeft: 'auto',
  },
  section: { marginBottom: '40px' },
  h2: {
    margin: '0 0 16px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#fdf6e3',
  },
  errorBox: {
    background: 'rgba(239,83,80,0.1)',
    border: '1px solid rgba(239,83,80,0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ef5350',
    fontSize: '14px',
    marginBottom: '16px',
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  ruleSkeleton: {
    height: '120px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  rulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  ruleCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(245,166,35,0.15)',
    borderRadius: '10px',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  ruleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  ruleName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fdf6e3',
  },
  ruleBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '20px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  ruleDescription: {
    margin: 0,
    fontSize: '13px',
    color: 'rgba(253,246,227,0.55)',
    lineHeight: 1.5,
  },
  ruleFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  ruleAmount: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#f5a623',
  },
  ruleCondition: {
    fontSize: '12px',
    color: 'rgba(253,246,227,0.4)',
    fontStyle: 'italic',
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    color: 'rgba(253,246,227,0.4)',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px dashed rgba(245,166,35,0.15)',
    fontSize: '14px',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '10px',
    border: '1px solid rgba(245,166,35,0.15)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'rgba(253,246,227,0.5)',
    background: 'rgba(245,166,35,0.06)',
    borderBottom: '1px solid rgba(245,166,35,0.15)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    color: '#fdf6e3',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    verticalAlign: 'middle',
  },
  rowEven: { background: 'rgba(255,255,255,0.02)' },
  rowOdd: { background: 'transparent' },
  code: {
    fontFamily: 'monospace',
    fontSize: '12px',
    background: 'rgba(255,255,255,0.07)',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#fdf6e3',
  },
};
