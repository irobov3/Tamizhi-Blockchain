import { useEffect, useState } from "react";
import { fetchRewardRecords, type RewardRecord } from "../api/chain";
import { useNetwork } from "../store/network";
import { useWallet } from "../store/wallet";
import { formatTmz } from "../utils/format";

export function Rewards() {
  const { active } = useWallet();
  const { current } = useNetwork();
  const [records, setRecords] = useState<RewardRecord[]>([]);

  useEffect(() => {
    if (!active) return;
    fetchRewardRecords(current, active.address)
      .then(setRecords)
      .catch(() => setRecords([]));
  }, [active, current]);

  const byEmployee = records.reduce<Record<string, bigint>>((acc, r) => {
    acc[r.employee_id] =
      (acc[r.employee_id] ?? 0n) + BigInt(r.amount?.amount ?? "0");
    return acc;
  }, {});

  const total = records.reduce(
    (acc, r) => acc + BigInt(r.amount?.amount ?? "0"),
    0n
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-xs uppercase tracking-wider text-gold/80 mb-1">
          Total earned
        </div>
        <div className="text-3xl font-bold">
          {formatTmz(total)}{" "}
          <span className="text-base text-gold">{current.display}</span>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
          By employee ID
        </h3>
        {Object.keys(byEmployee).length === 0 ? (
          <p className="text-cream/50 text-sm">No reward records.</p>
        ) : (
          Object.entries(byEmployee).map(([id, amt]) => (
            <div
              key={id}
              className="flex justify-between py-2 border-b border-gold/10 last:border-0"
            >
              <span className="font-mono text-cream/80">{id}</span>
              <span className="font-semibold">
                {formatTmz(amt)} {current.display}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
