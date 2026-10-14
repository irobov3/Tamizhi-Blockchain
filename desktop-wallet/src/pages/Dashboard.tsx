import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../store/wallet";
import { useNetwork } from "../store/network";
import { fetchBalance, fetchTxs, fetchDelegations, fetchRewards, type TxResp } from "../api/chain";
import { formatTmz, shortAddress, timeAgo } from "../utils/format";

const C = {
  bg:      '#0e0824',
  sidebar: '#0a0618',
  card:    '#1a1040',
  border:  '#2a1f5c',
  gold:    '#d4a017',
  cyan:    '#00d4ff',
  text:    '#fdf6e3',
  muted:   '#8a8aa0',
  success: '#00c48c',
  error:   '#ff4d4d',
  purple:  '#7c3aed',
}

const QUICK = [
  { to: "/send",    label: "Send",    icon: "📤", color: '#d4a017' },
  { to: "/receive", label: "Receive", icon: "📥", color: '#00d4ff' },
  { to: "/staking", label: "Stake",   icon: "🔒", color: '#7c3aed' },
  { to: "/history", label: "History", icon: "📜", color: '#00c48c' },
]

function txTypeIcon(type: string): { icon: string; color: string } {
  const t = type.toLowerCase()
  if (t.includes('send') || t === 'msgsend') return { icon: '↑', color: C.error }
  if (t.includes('receive') || t.includes('transfer')) return { icon: '↓', color: C.success }
  if (t.includes('delegate')) return { icon: '🔒', color: C.purple }
  if (t.includes('withdraw') || t.includes('reward')) return { icon: '⭐', color: C.gold }
  return { icon: '•', color: C.muted }
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '16px 20px',
      }}
    >
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>
      )}
    </div>
  )
}

export function Dashboard() {
  const { active } = useWallet()
  const { current } = useNetwork()
  const [utmz, setUtmz] = useState("0")
  const [txs, setTxs] = useState<TxResp[]>([])
  const [stakedUtmz, setStakedUtmz] = useState("0")
  const [rewardsUtmz, setRewardsUtmz] = useState("0")
  const [hoveredQuick, setHoveredQuick] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false;
    (async () => {
      try {
        const balances = await fetchBalance(current, active.address)
        if (cancelled) return
        const b = balances.find((c) => c.denom === current.denom)
        setUtmz(b?.amount ?? "0")
      } catch {
        if (!cancelled) setUtmz("0")
      }
      try {
        const t = await fetchTxs(current, active.address, 10)
        if (!cancelled) setTxs(t.slice(0, 5))
      } catch {
        if (!cancelled) setTxs([])
      }
      try {
        const dels = await fetchDelegations(current, active.address)
        if (!cancelled) {
          const total = dels.reduce((acc, d) => acc + BigInt(d.balance.amount || "0"), 0n)
          setStakedUtmz(total.toString())
        }
      } catch { /* delegation fetch failed */ }
      try {
        const result = await fetchRewards(current, active.address)
        if (!cancelled) {
          const r = result.total.find((c) => c.denom === current.denom)
          setRewardsUtmz(r?.amount?.split('.')[0] ?? "0")
        }
      } catch { /* rewards fetch failed */ }
    })()
    return () => { cancelled = true }
  }, [active, current])

  if (!active) {
    return (
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏦</div>
        <p style={{ color: C.muted, marginBottom: 16, fontSize: 15 }}>No wallet configured yet.</p>
        <Link
          to="/settings"
          style={{
            background: C.gold,
            color: '#1a1040',
            fontWeight: 700,
            padding: '10px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          Create or import a wallet
        </Link>
      </div>
    )
  }

  const tmzDisplay = formatTmz(utmz, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Balance card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1040 0%, #2a1a5e 100%)',
          border: `1px solid ${C.gold}40`,
          borderRadius: 16,
          padding: '28px 32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 8px 32px -8px ${C.gold}30`,
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `${C.gold}10`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ fontSize: 11, color: `${C.gold}cc`, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
          Available Balance
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 48, fontWeight: 800, color: C.text, lineHeight: 1 }}>
            {tmzDisplay}
          </span>
          <span style={{ fontSize: 24, fontWeight: 600, color: C.gold }}>TMZ</span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>
          {shortAddress(active.address, 10, 8)}
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {QUICK.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              onMouseEnter={() => setHoveredQuick(q.to)}
              onMouseLeave={() => setHoveredQuick(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: hoveredQuick === q.to ? `${q.color}25` : `${q.color}15`,
                border: `1px solid ${q.color}40`,
                color: q.color,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              <span>{q.icon}</span>
              <span>{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <StatCard
          label="Staked"
          value={`${formatTmz(stakedUtmz, 4)} TMZ`}
          sub="across validators"
        />
        <StatCard
          label="Pending Rewards"
          value={`${formatTmz(rewardsUtmz, 4)} TMZ`}
          sub="claimable now"
        />
        <StatCard
          label="Transactions"
          value={txs.length > 0 ? `${txs.length}+` : "0"}
          sub="recent activity"
        />
      </div>

      {/* Bottom row: recent txs + chart placeholder */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>

        {/* Recent transactions */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '20px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: C.gold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0, fontWeight: 700 }}>
              Recent Transactions
            </h3>
            <Link
              to="/history"
              style={{ color: C.gold, fontSize: 12, textDecoration: 'none', opacity: 0.8 }}
            >
              View all →
            </Link>
          </div>

          {txs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted, fontSize: 14 }}>
              No transactions yet
            </div>
          ) : (
            txs.map((t) => {
              const type = t.tx?.body?.messages?.[0]?.['@type']?.split('.').pop() ?? 'Tx'
              const { icon, color } = txTypeIcon(type)
              return (
                <div
                  key={t.txhash}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: `1px solid ${C.border}40`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: `${color}20`,
                        border: `1px solid ${color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        color,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{type}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>
                        {t.txhash.slice(0, 12)}… · #{t.height}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: t.code === 0 ? C.success : C.error,
                        fontWeight: 600,
                      }}
                    >
                      {t.code === 0 ? 'Success' : 'Failed'}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>
                      {timeAgo(t.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Portfolio chart placeholder + news */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Chart placeholder */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 140,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
            <div style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
              Price chart coming soon
            </div>
            <div style={{ fontSize: 11, color: C.gold, marginTop: 6 }}>$0.12 / TMZ</div>
          </div>

          {/* News */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3 style={{ color: C.gold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 10px', fontWeight: 700 }}>
              News
            </h3>
            {[
              'Tamizhi testnet phase II live — validators welcome',
              'Literature module v1 deployed on-chain',
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: C.muted,
                  padding: '6px 0',
                  borderBottom: i === 0 ? `1px solid ${C.border}40` : 'none',
                  lineHeight: 1.5,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
