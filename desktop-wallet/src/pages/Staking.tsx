import { useEffect, useMemo, useState } from "react";
import {
  fetchValidators,
  fetchDelegations,
  fetchRewards,
  type Validator,
  type Delegation,
  type Coin,
} from "../api/chain";
import { useNetwork } from "../store/network";
import { useWallet } from "../store/wallet";
import { connectSigning, delegate, undelegate, withdrawRewards } from "../wallet/client";
import { tmzToUtmz, formatTmz, shortAddress } from "../utils/format";
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
  purple:  '#7c3aed',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: '#0e0824',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '10px 12px',
  color: C.text,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'monospace',
}

type SortKey = "power" | "commission" | "apr";

function VpBar({ tokens, max }: { tokens: string; max: number }) {
  const pct = max > 0 ? Math.min((Number(tokens) / max) * 100, 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: `${C.border}80`, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: C.gold, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color: C.muted, minWidth: 40, textAlign: 'right' }}>
        {(Number(tokens) / 1e9).toFixed(1)}B
      </span>
    </div>
  )
}

export function Staking() {
  const { current } = useNetwork();
  const { active, signer, locked, unlock } = useWallet();
  const push = useToast((s) => s.push);
  const [vals, setVals] = useState<Validator[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [totalReward, setTotalReward] = useState<Coin[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("power");
  const [openV, setOpenV] = useState<Validator | null>(null);
  const [mode, setMode] = useState<"delegate" | "undelegate">("delegate");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [hovDelegate, setHovDelegate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await fetchValidators(current);
        if (!cancelled) setVals(v);
      } catch {
        if (!cancelled) setVals([]);
      }
      if (active) {
        try {
          const d = await fetchDelegations(current, active.address);
          if (!cancelled) setDelegations(d);
        } catch { /* ignore */ }
        try {
          const { total } = await fetchRewards(current, active.address);
          if (!cancelled) setTotalReward(total);
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, [current, active]);

  const sorted = useMemo(() => {
    const arr = [...vals];
    arr.sort((a, b) => {
      if (sortBy === "power") return Number(b.tokens) - Number(a.tokens);
      if (sortBy === "commission")
        return (
          Number(a.commission.commission_rates.rate) -
          Number(b.commission.commission_rates.rate)
        );
      return 0;
    });
    return arr;
  }, [vals, sortBy]);

  const maxVP = sorted.length > 0 ? Number(sorted[0].tokens) : 1;

  const totalRewardUtmz =
    totalReward.find((c) => c.denom === current.denom)?.amount.split(".")[0] ?? "0";

  const totalStakedUtmz = delegations
    .reduce((acc, d) => acc + BigInt(d.balance.amount || "0"), 0n)
    .toString();

  async function ensureSigner() {
    let s = signer;
    if (locked || !s) {
      await unlock(password);
      s = useWallet.getState().signer;
    }
    if (!s) throw new Error("Wallet not unlocked");
    return s;
  }

  async function submit() {
    if (!active || !openV) return;
    setBusy(true);
    try {
      const s = await ensureSigner();
      const client = await connectSigning(current, s);
      const utmz = tmzToUtmz(amount).toString();
      const fn = mode === "delegate" ? delegate : undelegate;
      const r = await fn(client, active.address, openV.operator_address, utmz, current.denom);
      if (r.code !== 0) throw new Error(r.rawLog || "tx failed");
      push("success", `${mode} successful! (tx: ${r.transactionHash?.slice(0, 12)}…)`);
      setOpenV(null);
      setAmount("");
    } catch (err: any) {
      push("error", err?.message ?? `${mode} failed`);
    } finally {
      setBusy(false);
    }
  }

  async function claimAll() {
    if (!active) return;
    setBusy(true);
    try {
      const s = await ensureSigner();
      const client = await connectSigning(current, s);
      const vs = delegations.map((d) => d.delegation.validator_address);
      if (vs.length === 0) throw new Error("Nothing to claim");
      await withdrawRewards(client, active.address, vs);
      push("success", "Rewards claimed successfully!");
    } catch (err: any) {
      push("error", err?.message ?? "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          { label: 'Total Staked', value: `${formatTmz(totalStakedUtmz, 4)} TMZ`, icon: '🔒' },
          { label: 'Pending Rewards', value: `${formatTmz(totalRewardUtmz, 6)} TMZ`, icon: '⭐' },
          { label: 'Active Delegations', value: String(delegations.length), icon: '📊' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Your delegations */}
      {delegations.length > 0 && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: C.gold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0, fontWeight: 700 }}>
              Your Delegations
            </h3>
            <button
              onClick={claimAll}
              disabled={busy}
              style={{
                background: C.gold,
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                color: '#1a1040',
                fontWeight: 700,
                fontSize: 12,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              Claim All Rewards
            </button>
          </div>

          {delegations.map((d) => (
            <div
              key={d.delegation.validator_address}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: `1px solid ${C.border}40`,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {shortAddress(d.delegation.validator_address, 10, 6)}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  Staked: {formatTmz(d.balance.amount, 4)} TMZ
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>
                  Rewards: — TMZ
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setOpenV(vals.find(v => v.operator_address === d.delegation.validator_address) ?? null); setMode("undelegate") }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 5,
                      background: `${C.error}20`,
                      border: `1px solid ${C.error}40`,
                      color: C.error,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Undelegate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validator list */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: C.gold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0, fontWeight: 700 }}>
            Validators ({sorted.length})
          </h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: '4px 8px',
              color: C.text,
              fontSize: 12,
              outline: 'none',
            }}
          >
            <option value="power">Voting Power</option>
            <option value="commission">Lowest Commission</option>
            <option value="apr">APR</option>
          </select>
        </div>

        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
            gap: 8,
            padding: '0 4px 10px',
            borderBottom: `1px solid ${C.border}`,
            fontSize: 10,
            color: C.muted,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          <div>Validator</div>
          <div>Voting Power</div>
          <div>Commission</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Action</div>
        </div>

        {sorted.map((v) => {
          const commission = (Number(v.commission.commission_rates.rate) * 100).toFixed(1)
          return (
            <div
              key={v.operator_address}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                gap: 8,
                alignItems: 'center',
                padding: '12px 4px',
                borderBottom: `1px solid ${C.border}30`,
              }}
            >
              {/* Validator name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#2a1a5e',
                    border: `1px solid ${C.gold}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.gold,
                    flexShrink: 0,
                  }}
                >
                  {v.description.moniker?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {v.description.moniker || 'Unnamed'}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>
                    {shortAddress(v.operator_address, 8, 4)}
                  </div>
                </div>
              </div>

              {/* VP bar */}
              <VpBar tokens={v.tokens} max={maxVP} />

              {/* Commission */}
              <div style={{ fontSize: 13, color: C.text }}>{commission}%</div>

              {/* Status badge */}
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    background: `${C.success}20`,
                    color: C.success,
                    border: `1px solid ${C.success}40`,
                  }}
                >
                  BONDED
                </span>
              </div>

              {/* Delegate button */}
              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => { setOpenV(v); setMode("delegate") }}
                  onMouseEnter={() => setHovDelegate(v.operator_address)}
                  onMouseLeave={() => setHovDelegate(null)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    background: hovDelegate === v.operator_address ? C.gold : `${C.gold}20`,
                    border: `1px solid ${C.gold}50`,
                    color: hovDelegate === v.operator_address ? '#1a1040' : C.gold,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  Delegate
                </button>
              </div>
            </div>
          )
        })}

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted, fontSize: 14 }}>
            No validators returned by REST endpoint.
          </div>
        )}
      </div>

      {/* Delegate Modal */}
      {openV && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpenV(null) }}
        >
          <div
            style={{
              background: '#13092e',
              border: `1px solid ${C.gold}40`,
              borderRadius: 16,
              padding: 28,
              width: 420,
              maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: C.gold, fontSize: 16, fontWeight: 700, margin: 0 }}>
                {mode === 'delegate' ? '🔒 Delegate to' : '🔓 Undelegate from'}{' '}
                {openV.description.moniker}
              </h3>
              <button
                onClick={() => setOpenV(null)}
                style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['delegate', 'undelegate'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 8,
                    background: mode === m ? C.gold : 'transparent',
                    border: `1px solid ${mode === m ? C.gold : C.border}`,
                    color: mode === m ? '#1a1040' : C.muted,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                Amount (TMZ)
              </label>
              <input
                style={INPUT_STYLE}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.000000"
              />
            </div>

            {/* Fee note */}
            <div
              style={{
                background: `${C.gold}10`,
                border: `1px solid ${C.gold}20`,
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 11,
                color: C.muted,
                marginBottom: 16,
              }}
            >
              Fee: 2000 utmz ≈ 0.002 TMZ
            </div>

            {/* Password */}
            {locked && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  style={{ ...INPUT_STYLE, fontFamily: 'inherit' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wallet password"
                />
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy || !amount || Number(amount) <= 0}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                background: C.gold,
                border: 'none',
                color: '#1a1040',
                fontWeight: 700,
                fontSize: 14,
                cursor: busy || !amount || Number(amount) <= 0 ? 'not-allowed' : 'pointer',
                opacity: busy || !amount || Number(amount) <= 0 ? 0.6 : 1,
              }}
            >
              {busy ? 'Submitting…' : `Confirm ${mode}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
