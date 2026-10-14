import { shortAddress, timeAgo } from "../utils/format";

type Props = {
  hash: string;
  height: string;
  timestamp: string;
  type: string;
  counterparty?: string;
  amount?: string;
  success: boolean;
};

export function TxRow({
  hash,
  height,
  timestamp,
  type,
  counterparty,
  amount,
  success,
}: Props) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gold/5 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            success
              ? "bg-gold/15 text-gold"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {type[0]?.toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-medium text-cream">{type}</div>
          <div className="text-xs text-cream/50 font-mono">
            {shortAddress(hash, 6, 6)} · #{height}
          </div>
        </div>
      </div>
      <div className="text-right">
        {amount && (
          <div className="text-sm font-semibold text-cream">{amount}</div>
        )}
        {counterparty && (
          <div className="text-xs text-cream/50 font-mono">
            {shortAddress(counterparty, 8, 6)}
          </div>
        )}
        <div className="text-[10px] text-cream/40">
          {timestamp ? timeAgo(timestamp) : ""}
        </div>
      </div>
    </div>
  );
}
