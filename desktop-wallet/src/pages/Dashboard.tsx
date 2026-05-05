import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BalanceCard } from "../components/BalanceCard";
import { TxRow } from "../components/TxRow";
import { useWallet } from "../store/wallet";
import { useNetwork } from "../store/network";
import { fetchBalance, fetchTxs, type TxResp } from "../api/chain";

const QUICK = [
  { to: "/send", label: "Send", icon: "↗" },
  { to: "/receive", label: "Receive", icon: "↙" },
  { to: "/staking", label: "Stake", icon: "◈" },
  { to: "/history", label: "History", icon: "≡" },
];

export function Dashboard() {
  const { active } = useWallet();
  const { current } = useNetwork();
  const [utmz, setUtmz] = useState("0");
  const [txs, setTxs] = useState<TxResp[]>([]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const balances = await fetchBalance(current, active.address);
        if (cancelled) return;
        const b = balances.find((c) => c.denom === current.denom);
        setUtmz(b?.amount ?? "0");
      } catch {
        if (!cancelled) setUtmz("0");
      }
      try {
        const t = await fetchTxs(current, active.address, 8);
        if (!cancelled) setTxs(t.slice(0, 5));
      } catch {
        if (!cancelled) setTxs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, current]);

  if (!active) {
    return (
      <div className="card text-center">
        <p className="text-cream/70 mb-3">No wallet yet.</p>
        <Link to="/settings" className="btn-primary">
          Create or import a wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BalanceCard utmz={utmz} usdRate={0.12} change24h={2.4} />

      <div className="grid grid-cols-4 gap-3">
        {QUICK.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="card text-center hover:border-gold/50 transition"
          >
            <div className="text-2xl text-gold mb-1">{q.icon}</div>
            <div className="text-sm font-medium">{q.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">
              Recent transactions
            </h3>
            <Link to="/history" className="text-xs text-gold hover:underline">
              View all
            </Link>
          </div>
          {txs.length === 0 ? (
            <p className="text-cream/50 text-sm py-6 text-center">
              No transactions yet
            </p>
          ) : (
            txs.map((t) => (
              <TxRow
                key={t.txhash}
                hash={t.txhash}
                height={t.height}
                timestamp={t.timestamp}
                type={t.tx?.body?.messages?.[0]?.["@type"]?.split(".").pop() ?? "Tx"}
                success={t.code === 0}
              />
            ))
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
            TMZ Price
          </h3>
          <div className="text-3xl font-bold text-cream">$0.12</div>
          <div className="text-xs text-green-400 mt-1">+2.4% 24h</div>
          <div className="mt-4 text-[10px] text-cream/40">
            (Stub: live oracle pending)
          </div>

          <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3 mt-6">
            News
          </h3>
          <div className="text-xs text-cream/60 space-y-2">
            <p>Tamizhi testnet phase II live · validators welcome</p>
            <p>Literature module v1 deployed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
