'use client';

import React, { useEffect, useState } from 'react';
import { getActiveNodes, type ChainNode } from '@/lib/api';

const UTMZ_FACTOR = 1_000_000;

function formatStake(amount: string, denom: string): string {
  if (denom === 'utmz') {
    const n = parseInt(amount, 10);
    if (isNaN(n)) return '—';
    return `${(n / UTMZ_FACTOR).toFixed(2)} TMZ`;
  }
  return `${amount} ${denom}`;
}

function formatUptime(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

type NodeStatus = 'active' | 'jailed' | 'inactive';

const statusConfig: Record<NodeStatus, { label: string; color: string; bg: string; border: string }> = {
  active: {
    label: 'Active',
    color: '#4caf50',
    bg: 'rgba(76,175,80,0.15)',
    border: 'rgba(76,175,80,0.35)',
  },
  jailed: {
    label: 'Jailed',
    color: '#ef5350',
    bg: 'rgba(239,83,80,0.15)',
    border: 'rgba(239,83,80,0.35)',
  },
  inactive: {
    label: 'Inactive',
    color: 'rgba(253,246,227,0.4)',
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.12)',
  },
};

function StatusBadge({ status }: { status: NodeStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.inactive;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

function UptimeBar({ score }: { score: number }) {
  const pct = Math.min(1, Math.max(0, score)) * 100;
  const color = pct >= 90 ? '#4caf50' : pct >= 70 ? '#f5a623' : '#ef5350';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '80px',
          height: '6px',
          borderRadius: '3px',
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span style={{ fontSize: '13px', color, fontWeight: 600 }}>{formatUptime(score)}</span>
    </div>
  );
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | NodeStatus>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getActiveNodes();
        setNodes(data);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load nodes.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filter === 'all' ? nodes : nodes.filter((n) => n.status === filter);
  const counts = {
    all: nodes.length,
    active: nodes.filter((n) => n.status === 'active').length,
    jailed: nodes.filter((n) => n.status === 'jailed').length,
    inactive: nodes.filter((n) => n.status === 'inactive').length,
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.h1}>Active Nodes</h1>
        <p style={styles.subtitle}>
          {loading ? 'Loading…' : `${counts.all} nodes on the Tamizhi network`}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={styles.filterRow}>
        {(['all', 'active', 'jailed', 'inactive'] as const).map((f) => (
          <button
            key={f}
            style={{
              ...styles.filterBtn,
              ...(filter === f ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={styles.filterCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={styles.tableWrapper}>
          <div style={styles.loadingRows}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={styles.skeletonRow} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>No nodes found for this filter.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Node ID / Moniker</th>
                <th style={styles.th}>Endpoint</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Uptime Score</th>
                <th style={styles.th}>Staked Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((node: any, i) => {
                // Chain returns:  { id, endpoint, status, uptime_score, staked_amount: {denom, amount}, ... }
                const nodeId = node.id ?? node.node_id ?? '—';
                const moniker = node.moniker;
                const endpoint = node.endpoint ?? '—';
                const status = (node.status ?? 'inactive').toString().toLowerCase();
                // uptime_score is a uint (0-100). Convert to fraction for UptimeBar.
                const uptimeRaw = parseInt(node.uptime_score ?? '0', 10);
                const uptimeFrac = isNaN(uptimeRaw) ? 0 : uptimeRaw / 100;
                // staked_amount is either a Coin object or a plain string.
                const stakeAmount = typeof node.staked_amount === 'object' && node.staked_amount !== null
                  ? node.staked_amount.amount
                  : node.staked_amount;
                const stakeDenom = typeof node.staked_amount === 'object' && node.staked_amount !== null
                  ? node.staked_amount.denom
                  : (node.staked_denom ?? 'utmz');
                return (
                <tr key={nodeId} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {moniker && (
                        <span style={{ fontWeight: 600, color: '#fdf6e3' }}>{moniker}</span>
                      )}
                      <code style={styles.code}>{nodeId}</code>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <a
                      href={endpoint}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.endpointLink}
                    >
                      {endpoint}
                    </a>
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={status as NodeStatus} />
                  </td>
                  <td style={styles.td}>
                    <UptimeBar score={uptimeFrac} />
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#f5a623' }}>
                    {formatStake(stakeAmount, stakeDenom)}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: '24px' },
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
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid rgba(245,166,35,0.2)',
    background: 'transparent',
    color: 'rgba(253,246,227,0.6)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  filterBtnActive: {
    background: 'rgba(245,166,35,0.15)',
    borderColor: 'rgba(245,166,35,0.5)',
    color: '#f5a623',
  },
  filterCount: {
    fontSize: '11px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '1px 6px',
    fontWeight: 700,
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
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: 'rgba(253,246,227,0.4)',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px dashed rgba(245,166,35,0.15)',
    fontSize: '14px',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid rgba(245,166,35,0.15)',
  },
  loadingRows: { display: 'flex', flexDirection: 'column', gap: '1px' },
  skeletonRow: {
    height: '56px',
    background: 'rgba(255,255,255,0.04)',
    animation: 'pulse 1.5s ease-in-out infinite',
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
    padding: '14px 16px',
    color: '#fdf6e3',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    verticalAlign: 'middle',
  },
  rowEven: { background: 'rgba(255,255,255,0.02)' },
  rowOdd: { background: 'transparent' },
  code: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: 'rgba(253,246,227,0.55)',
  },
  endpointLink: {
    color: 'rgba(253,246,227,0.6)',
    textDecoration: 'none',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
};
