import { useEffect, useState } from "react";
import { useNetwork } from "../store/network";
import { fetchNodeStatus } from "../api/chain";
import { useWallet } from "../store/wallet";

export function Header() {
  const { current } = useNetwork();
  const { wallets, active, setActive, locked, lock } = useWallet();
  const [online, setOnline] = useState<boolean | null>(null);
  const [height, setHeight] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await fetchNodeStatus(current);
        if (cancelled) return;
        setOnline(true);
        const h = s.latest?.block?.header?.height ?? s.latest?.block_id?.hash;
        setHeight(h ? String(h).slice(0, 12) : null);
      } catch {
        if (!cancelled) {
          setOnline(false);
          setHeight(null);
        }
      }
    };
    tick();
    const id = setInterval(tick, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [current]);

  return (
    <header className="h-14 px-6 border-b border-gold/10 flex items-center justify-between bg-indigo-deep/60 backdrop-blur">
      <div className="flex items-center gap-4">
        <select
          value={active?.id ?? ""}
          onChange={(e) => setActive(e.target.value)}
          className="bg-indigo-night border border-gold/20 rounded px-2 py-1 text-sm"
        >
          {wallets.length === 0 && <option value="">No wallets</option>}
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {!locked ? (
          <button onClick={lock} className="text-xs text-gold/80 hover:text-gold">
            Lock
          </button>
        ) : (
          <span className="text-xs text-cream/40">Locked</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              online === null
                ? "bg-cream/30"
                : online
                ? "bg-green-400"
                : "bg-red-500"
            }`}
          />
          <span className="text-cream/70">{current.label}</span>
          {height && (
            <span className="font-mono text-cream/40">#{height}</span>
          )}
        </div>
      </div>
    </header>
  );
}
