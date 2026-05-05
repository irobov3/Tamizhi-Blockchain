import { useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  display?: string; // e.g. TMZ
  micro?: string; // e.g. utmz
  usdRate?: number;
  max?: string; // in display units
};

export function AmountInput({
  value,
  onChange,
  display = "TMZ",
  micro = "utmz",
  usdRate,
  max,
}: Props) {
  const [denomMode, setDenomMode] = useState<"display" | "micro">("display");
  const usd =
    usdRate && value ? (Number(value) * usdRate).toFixed(2) : null;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label className="label mb-0">Amount</label>
        {max && (
          <button
            type="button"
            className="text-xs text-gold hover:underline"
            onClick={() => onChange(max)}
          >
            Max: {max}
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1 font-mono"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="0.00"
        />
        <button
          type="button"
          onClick={() =>
            setDenomMode((m) => (m === "display" ? "micro" : "display"))
          }
          className="px-3 rounded-lg border border-gold/30 text-gold text-sm font-medium hover:bg-indigo-mid/40"
        >
          {denomMode === "display" ? display : micro}
        </button>
      </div>
      {usd && (
        <div className="text-xs text-cream/50 mt-1">≈ ${usd} USD</div>
      )}
    </div>
  );
}
