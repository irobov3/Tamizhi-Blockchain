'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { useWallet } from '@/hooks/useWallet';
import {
  getRewardRecords,
  getActiveNodes,
  getLiteratureWorks,
  getAccessLogs,
  getChainStats,
  type RewardRecord,
} from '@/lib/api';

const UTMZ_FACTOR = 1_000_000;

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function formatUtmz(amount: string): string {
  const n = parseInt(amount, 10);
  if (isNaN(n)) return '0 TMZ';
  return `${(n / UTMZ_FACTOR).toFixed(2)} TMZ`;
}

export default function DashboardPage() {
  const { address, balance, isConnected } = useWallet();

  const [recentRewards, setRecentRewards] = useState<RewardRecord[]>([]);
  const [stats, setStats] = useState({
    totalRewards: '—',
    accessLogs: '—',
    activeNodes: '—',
    literatureWorks: '—',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const [nodes, works] = await Promise.allSettled([
          getActiveNodes(),
          getLiteratureWorks(),
        ]);

        setStats((prev) => ({
          ...prev,
          activeNodes: nodes.status === 'fulfilled' ? String(nodes.value.length) : '—',
          literatureWorks: works.status === 'fulfilled' ? String(works.value.length) : '—',
        }));
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    if (!address) return;
    async function loadUserData() {
      try {
        const [rewards, logs] = await Promise.allSettled([
          getRewardRecords(address!),
          getAccessLogs(address!),
        ]);

        if (rewards.status === 'fulfilled') {
          const sorted = [...rewards.value].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
          setRecentRewards(sorted.slice(0, 5));
          setStats((prev) => ({ ...prev, totalRewards: String(rewards.value.length) }));
        }

        if (logs.status === 'fulfilled') {
          setStats((prev) => ({ ...prev, accessLogs: String(logs.value.length) }));
        }
      } catch {
        // non-fatal
      }
    }
    loadUserData();
  }, [address]);

  return (
    <div>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.h1}>Dashboard</h1>
        <p style={styles.subtitle}>
          {isConnected
            ? `Viewing data for ${address?.slice(0, 16)}…`
            : 'Connect your wallet to see your data'}
        </p>
      </div>

      {/* Wallet summary */}
      {isConnected && (
        <div style={styles.walletCard}>
          <div>
            <div style={styles.label}>Wallet Address</div>
            <div style={styles.addressText}>{address}</div>
          </div>
          <div style={styles.balanceBlock}>
            <div style={styles.label}>TMZ Balance</div>
            <div style={styles.balanceValue}>
              {balance !== null ? `${parseFloat(balance).toFixed(4)} TMZ` : '…'}
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={styles.statsGrid}>
        <StatCard
          icon="🏆"
          title="Total Rewards Earned"
          value={stats.totalRewards}
          loading={loading && isConnected}
        />
        <StatCard
          icon="📋"
          title="Access Log Entries"
          value={stats.accessLogs}
          loading={loading && isConnected}
        />
        <StatCard
          icon="🖥️"
          title="Active Nodes"
          value={stats.activeNodes}
          loading={loading}
        />
        <StatCard
          icon="📜"
          title="Literature Works"
          value={stats.literatureWorks}
          loading={loading}
        />
      </div>

      {/* Recent rewards */}
      <section style={styles.section}>
        <h2 style={styles.h2}>Recent Reward Events</h2>
        {!isConnected ? (
          <div style={styles.emptyState}>
            Connect your wallet to view your reward history.
          </div>
        ) : recentRewards.length === 0 ? (
          <div style={styles.emptyState}>No reward records found.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Record ID</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {recentRewards.map((r, i) => (
                  <tr key={r.id ?? i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td style={styles.td}>
                      <code style={styles.code}>{r.id?.slice(0, 12) ?? '—'}</code>
                    </td>
                    <td style={{ ...styles.td, color: '#f5a623', fontWeight: 600 }}>
                      {formatUtmz(r.amount)}
                    </td>
                    <td style={styles.td}>{r.reason ?? '—'}</td>
                    <td style={{ ...styles.td, fontSize: '12px', color: 'rgba(253,246,227,0.6)' }}>
                      {formatTimestamp(r.timestamp)}
                    </td>
                    <td style={styles.td}>
                      {r.tx_hash ? (
                        <code style={{ ...styles.code, fontSize: '11px' }}>
                          {r.tx_hash.slice(0, 12)}…
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
  walletCard: {
    background: 'rgba(245,166,35,0.08)',
    border: '1px solid rgba(245,166,35,0.25)',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  label: {
    fontSize: '12px',
    color: 'rgba(253,246,227,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '4px',
  },
  addressText: {
    fontSize: '14px',
    fontFamily: 'monospace',
    color: '#fdf6e3',
    wordBreak: 'break-all',
  },
  balanceBlock: { textAlign: 'right' },
  balanceValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f5a623',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '36px',
  },
  section: { marginBottom: '36px' },
  h2: {
    margin: '0 0 16px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#fdf6e3',
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
