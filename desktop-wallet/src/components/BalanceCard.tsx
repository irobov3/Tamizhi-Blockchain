import { formatTmz } from "../utils/format";

type Props = {
  utmz: string | bigint;
  usdRate?: number; // optional USD per TMZ
  change24h?: number;
};

export function BalanceCard({ utmz, usdRate, change24h }: Props) {
  const tmz = formatTmz(utmz, 4);
  const usd =
    usdRate != null
      ? (Number(formatTmz(utmz, 6)) * usdRate).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })
      : null;

  return (
    <div className="card bg-gradient-to-br from-indigo-deep to-indigo-mid border-gold/40 shadow-gold relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-gold/10 blur-2xl" />
      <div className="text-xs uppercase tracking-widest text-gold/80 mb-1">
        Available Balance
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold text-cream">{tmz}</span>
        <span className="text-xl font-semibold text-gold">TMZ</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-sm">
        {usd && <span className="text-cream/70">{usd}</span>}
        {change24h != null && (
          <span
            className={`pill ${
              change24h >= 0 ? "text-green-400 border-green-400/40" : "text-red-400 border-red-400/40"
            }`}
          >
            {change24h >= 0 ? "+" : ""}
            {change24h.toFixed(2)}% 24h
          </span>
        )}
      </div>
    </div>
  );
}
