'use client';

import React, { useEffect, useState } from 'react';

const REST = process.env.NEXT_PUBLIC_REST_URL ?? 'https://api.tamizhi.ai';

interface ChainNodeV2 {
  id: string;
  operator: string;
  status: string;
  registered_at: string;
  endpoint?: string;
  moniker?: string;
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const color = s === 'active' ? '#4caf50' : s === 'jailed' ? '#ef5350' : 'rgba(253,246,227,0.4)';
  const bg = s === 'active' ? 'rgba(76,175,80,0.15)' : s === 'jailed' ? 'rgba(239,83,80,0.15)' : 'rgba(255,255,255,0.06)';
  const border = s === 'active' ? 'rgba(76,175,80,0.35)' : s === 'jailed' ? 'rgba(239,83,80,0.35)' : 'rgba(255,255,255,0.12)';
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color,
      background: bg,
      border: `1px solid ${border}`,
    }}>
      {status || 'Unknown'}
    </span>
  );
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<ChainNodeV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${REST}/tamizhi/nodes/v1/nodes`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Normalize — the response may have .nodes or be an array directly
        const raw: any[] = data?.nodes ?? data ?? [];
        const normalized: ChainNodeV2[] = raw.map((n: any) => ({
          id: n.id ?? n.node_id ?? '—',
          operator: n.operator ?? n.operator_address ?? n.owner ?? '—',
          status: n.status ?? 'unknown',
          registered_at: n.registered_at ?? n.created_at ?? '',
          endpoint: n.endpoint,
          moniker: n.moniker,
        }));
        setNodes(normalized);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to fetch nodes');
        setNodes([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div style={pageHeader}>
        <h1 style={h1}>Node Registry</h1>
        <p style={subtitle}>
          {loading ? 'Loading…' : `${nodes.length} node${nodes.length !== 1 ? 's' : ''} registered on the Tamizhi network`}
        </p>
      </div>

      {error && (
        <div style={errorBox}>
          Failed to load nodes: {error}
        </div>
      )}

      {loading ? (
        <div style={tableWrap}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={skeletonRow} />
            ))}
          </div>
        </div>
      ) : nodes.length === 0 ? (
        <div style={emptyBox}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌐</div>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'rgba(253,246,227,0.6)' }}>
            No nodes registered yet
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'rgba(253,246,227,0.35)' }}>
            Nodes will appear here once they register on the Tamizhi network.
          </p>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                {['Node ID', 'Operator', 'Status', 'Registered At'].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodes.map((node, i) => (
                <tr key={node.id} style={i % 2 === 0 ? rowEven : {}}>
                  <td style={td}>
                    {node.moniker && (
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{node.moniker}</div>
                    )}
                    <code style={codeStyle}>{node.id}</code>
                    {node.endpoint && (
                      <div style={{ marginTop: '3px' }}>
                        <a
                          href={node.endpoint}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#00d4ff', fontSize: '11px', textDecoration: 'none', fontFamily: 'monospace' }}
                        >
                          {node.endpoint}
                        </a>
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    <code style={{ ...codeStyle, fontSize: '11px' }}>
                      {node.operator.length > 32 ? `${node.operator.slice(0, 20)}…${node.operator.slice(-8)}` : node.operator}
                    </code>
                  </td>
                  <td style={td}>
                    <StatusBadge status={node.status} />
                  </td>
                  <td style={{ ...td, fontSize: '12px', color: 'rgba(253,246,227,0.5)' }}>
                    {node.registered_at ? formatDate(node.registered_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageHeader: React.CSSProperties = { marginBottom: '24px' };
const h1: React.CSSProperties = { margin: 0, fontSize: '28px', fontWeight: 700, color: '#fdf6e3', letterSpacing: '-0.02em' };
const subtitle: React.CSSProperties = { margin: '6px 0 0', fontSize: '14px', color: 'rgba(253,246,227,0.5)' };

const errorBox: React.CSSProperties = {
  background: 'rgba(239,83,80,0.1)',
  border: '1px solid rgba(239,83,80,0.3)',
  borderRadius: '8px',
  padding: '12px 16px',
  color: '#ef5350',
  fontSize: '14px',
  marginBottom: '16px',
};

const emptyBox: React.CSSProperties = {
  padding: '56px 32px',
  textAlign: 'center',
  color: 'rgba(253,246,227,0.4)',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '12px',
  border: '1px dashed rgba(42,31,92,0.8)',
};

const tableWrap: React.CSSProperties = {
  overflowX: 'auto',
  borderRadius: '12px',
  border: '1px solid rgba(42,31,92,0.8)',
};

const skeletonRow: React.CSSProperties = {
  height: '56px',
  background: 'rgba(255,255,255,0.04)',
  animation: 'pulse 1.5s ease-in-out infinite',
};

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };

const th: React.CSSProperties = {
  padding: '12px 16px',
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
  padding: '14px 16px',
  color: '#fdf6e3',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
};

const rowEven: React.CSSProperties = { background: 'rgba(255,255,255,0.015)' };

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: 'rgba(253,246,227,0.55)',
};
