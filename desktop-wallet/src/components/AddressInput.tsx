import { isLikelyBech32 } from "../utils/format";

type Props = {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  placeholder?: string;
};

export function AddressInput({
  value,
  onChange,
  prefix = "tamizhi",
  placeholder = "tamizhi1...",
}: Props) {
  const valid = !value || isLikelyBech32(value, prefix);
  return (
    <div>
      <label className="label">Recipient address</label>
      <div className="relative">
        <input
          className={`input pr-24 font-mono ${
            !valid ? "border-red-500/60" : ""
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={placeholder}
          spellCheck={false}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost text-xs"
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) onChange(text.trim());
            } catch {
              /* clipboard denied */
            }
          }}
        >
          Paste
        </button>
      </div>
      {!valid && (
        <div className="text-xs text-red-400 mt-1">
          Not a valid {prefix} bech32 address
        </div>
      )}
    </div>
  );
}
