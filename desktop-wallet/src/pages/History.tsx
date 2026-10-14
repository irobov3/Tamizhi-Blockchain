import { useEffect, useMemo, useState } from "react";
import { fetchTxs, type TxResp } from "../api/chain";
import { useNetwork } from "../store/network";
import { useWallet } from "../store/wallet";
import { timeAgo } from "../utils/format";

const C = {
  bg:      '#0e0824',
  card:    '#1a1040',
  border:  '#2a1f5c',
  gold:    '#d4a017',
  text:    '#fdf6e3',
  muted:   '#8a8aa0',
  success: '#00c48c',
  error:   '#ff4d4d',
  purple:  '#7c3aed',
  cyan:    '#00d4ff',
}

const FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'send',   label: 'Sent' },
  { id: 'receive', label: 'Received' },
  { id: 'stake',  label: 'Staking' },
  { id: 'reward', label: 'Rewards' },
] as const;

type FilterId = typeof FILTERS[number]['id'];

function classify(t: TxResp): FilterId {
  const type = t.tx?.body?.messages?.[0]?.['@type']?.toLowerCase?.() ?? '';
  if (type.includes('delegate') || type.includes('undelegate') || type.includes('redelegate')) return 'stake';
  if (type.includes('withdrawdelegatorreward')) return 'reward';
  if (type.includes('send')) return 'send';
  return 'receive';
}

function txIcon(filter: FilterId): { icon: string; color: string } {
  switch (filter) {
    case 'send':    return { icon: '↑', color: C.error }
    case 'receive': return { icon: '↓', color: C.success }
    case 'stake':   return { icon: '🔒', color: C.purple }
    case 'reward':  return { icon: '⭐', color: C.gold }
    default:        return { icon: '•', color: C.muted }
  }
}

const PAGE = 20;

export function History() {
  const { active } = useWallet();
  const { current } = useNetwork();
  const [txs, setTxs] = useState<TxResp[]>([]);
  const [filter, setFilter] = useState<FilterId>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [hovFilter, setHovFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    fetchTxs(current, active.address, 200)
      .then(setTxs)
      .catch(() => setTxs([]))
      .finally(() => setLoading(false));
  }, [active, current]);

  const filtered = useMemo(() => {
    if (filter === 'all') return txs;
    return txs.filter((t) => classify(t) === filter);
  }, [txs, filter]);

  const slice = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch { /* denied */ }
  }

  function exportCsv() {
    const rows = [
      ['txhash', 'height', 'timestamp', 'type', 'code'].join(','),
      ...filtered.map((t) =>
        [t.txhash, t.height, t.timestamp, t.tx?.body?.messages?.[0]?.['@type'] ?? '', t.code].join(',')
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamizhi-txs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 24,
      }}
    >
      {/* Filter bar + export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(0); }}
              onMouseEnter={() => setHovFilter(f.id)}
              onMouseLeave={() => setHovFilter(null)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: filter === f.id ? 700 : 400,
                border: `1px solid ${filter === f.id ? C.gold : C.border}`,
                background: filter === f.id ? C.gold : hovFilter === f.id ? `${C.gold}15` : 'transparent',
                color: filter === f.id ? '#1a1040' : hovFilter === f.id ? C.gold : C.muted,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.muted,
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted, fontSize: 14 }}>
          Loading transactions…
        </div>
      )}

      {/* Empty state */}
      {!loading && slice.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
          <div style={{ color: C.muted, fontSize: 14 }}>No transactions yet</div>
        </div>
      )}

      {/* Transaction list */}
      {slice.map((t) => {
        const cat = classify(t);
        const typeName = t.tx?.body?.messages?.[0]?.['@type']?.split('.').pop() ?? 'Tx';
        const { icon, color } = txIcon(cat);
        const isOutgoing = cat === 'send';

        return (
          <div
            key={t.txhash}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: `1px solid ${C.border}30`,
            }}
          >
            {/* Left: icon + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: `${color}20`,
                  border: `1px solid ${color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{typeName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>
                    {t.txhash.slice(0, 12)}…
                  </span>
                  <button
                    onClick={() => copyHash(t.txhash)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedHash === t.txhash ? C.success : C.muted,
                      fontSize: 10,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title="Copy hash"
                  >
                    {copiedHash === t.txhash ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>

            {/* Middle: type badge */}
            <div style={{ textAlign: 'center', padding: '0 16px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 600,
                  background: `${color}15`,
                  color,
                  border: `1px solid ${color}30`,
                }}
              >
                {cat.toUpperCase()}
              </span>
            </div>

            {/* Right: amount + time */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isOutgoing ? C.error : C.success,
                }}
              >
                {isOutgoing ? '−' : '+'}
                {' '}TMZ
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                {t.timestamp ? timeAgo(t.timestamp) : '—'}
              </div>
              <div style={{ fontSize: 10, color: `${C.muted}80`, fontFamily: 'monospace' }}>
                #{t.height}
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${C.border}30`,
          fontSize: 12,
          color: C.muted,
        }}
      >
        <span>Page {page + 1} / {totalPages} · {filtered.length} transactions</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: page === 0 ? `${C.muted}50` : C.muted,
              fontSize: 12,
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE >= filtered.length}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: (page + 1) * PAGE >= filtered.length ? `${C.muted}50` : C.muted,
              fontSize: 12,
              cursor: (page + 1) * PAGE >= filtered.length ? 'not-allowed' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
