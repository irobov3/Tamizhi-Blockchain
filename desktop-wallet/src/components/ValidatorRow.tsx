import type { Validator } from "../api/chain";
import { formatTmz, shortAddress } from "../utils/format";

type Props = {
  v: Validator;
  apr?: number;
  onDelegate?: (v: Validator) => void;
};

export function ValidatorRow({ v, apr, onDelegate }: Props) {
  const commission = (Number(v.commission.commission_rates.rate) * 100).toFixed(2);
  return (
    <div className="grid grid-cols-12 gap-3 items-center py-3 border-b border-gold/5 last:border-0">
      <div className="col-span-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-deep border border-gold/30 flex items-center justify-center font-bold text-gold">
          {v.description.moniker?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-cream truncate">
            {v.description.moniker || "Unnamed"}
          </div>
          <div className="text-[10px] text-cream/40 font-mono truncate">
            {shortAddress(v.operator_address, 10, 6)}
          </div>
        </div>
      </div>
      <div className="col-span-3 text-sm text-cream/80">
        {formatTmz(v.tokens, 0)} <span className="text-cream/40 text-xs">TMZ</span>
      </div>
      <div className="col-span-2 text-sm text-cream/80">{commission}%</div>
      <div className="col-span-1 text-sm text-gold">
        {apr != null ? `${apr.toFixed(1)}%` : "—"}
      </div>
      <div className="col-span-2 text-right">
        <button onClick={() => onDelegate?.(v)} className="btn-primary text-xs px-3 py-1">
          Delegate
        </button>
      </div>
    </div>
  );
}
