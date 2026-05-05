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
import { ValidatorRow } from "../components/ValidatorRow";
import { Modal } from "../components/Modal";
import { AmountInput } from "../components/AmountInput";
import { connectSigning, delegate, undelegate, withdrawRewards } from "../wallet/client";
import { tmzToUtmz, formatTmz } from "../utils/format";
import { useToast } from "../components/Toast";

type SortKey = "power" | "commission" | "apr";

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
        } catch {}
        try {
          const { total } = await fetchRewards(current, active.address);
          if (!cancelled) setTotalReward(total);
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const totalRewardUtmz =
    totalReward.find((c) => c.denom === current.denom)?.amount.split(".")[0] ?? "0";

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
      const r = await fn(
        client,
        active.address,
        openV.operator_address,
        utmz,
        current.denom
      );
      if (r.code !== 0) throw new Error(r.rawLog || "tx failed");
      push("success", `${mode} ok`);
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
      push("success", "Rewards claimed");
    } catch (err: any) {
      push("error", err?.message ?? "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-gold/80 mb-1">
            Total staked
          </div>
          <div className="text-2xl font-bold">
            {formatTmz(
              delegations.reduce(
                (acc, d) => acc + BigInt(d.balance.amount || "0"),
                0n
              )
            )}{" "}
            <span className="text-sm text-gold">{current.display}</span>
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-gold/80 mb-1">
            Pending rewards
          </div>
          <div className="text-2xl font-bold">
            {formatTmz(totalRewardUtmz)}{" "}
            <span className="text-sm text-gold">{current.display}</span>
          </div>
          <button
            className="btn-secondary mt-2 text-xs"
            onClick={claimAll}
            disabled={busy || delegations.length === 0}
          >
            Claim all
          </button>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-gold/80 mb-1">
            Active delegations
          </div>
          <div className="text-2xl font-bold">{delegations.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">
            Validators ({sorted.length})
          </h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-indigo-night border border-gold/20 rounded px-2 py-1 text-xs"
          >
            <option value="power">Voting power</option>
            <option value="commission">Lowest commission</option>
            <option value="apr">APR</option>
          </select>
        </div>
        <div className="grid grid-cols-12 gap-3 px-1 pb-2 text-[10px] uppercase tracking-wider text-cream/40 border-b border-gold/10">
          <div className="col-span-4">Validator</div>
          <div className="col-span-3">Voting power</div>
          <div className="col-span-2">Commission</div>
          <div className="col-span-1">APR</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        {sorted.map((v) => (
          <ValidatorRow
            key={v.operator_address}
            v={v}
            apr={12}
            onDelegate={(vv) => {
              setOpenV(vv);
              setMode("delegate");
            }}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-cream/40 text-sm py-6 text-center">
            No validators returned by REST endpoint.
          </p>
        )}
      </div>

      <Modal
        open={!!openV}
        onClose={() => setOpenV(null)}
        title={openV ? `${mode} — ${openV.description.moniker}` : ""}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("delegate")}
              className={mode === "delegate" ? "btn-primary" : "btn-secondary"}
            >
              Delegate
            </button>
            <button
              onClick={() => setMode("undelegate")}
              className={mode === "undelegate" ? "btn-primary" : "btn-secondary"}
            >
              Undelegate
            </button>
          </div>
          <AmountInput
            value={amount}
            onChange={setAmount}
            display={current.display}
            micro={current.denom}
          />
          {locked && (
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          <button onClick={submit} className="btn-primary w-full" disabled={busy}>
            {busy ? "Submitting…" : `Confirm ${mode}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
