import { useEffect, useState } from "react";
import { useWallet } from "../store/wallet";
import { useNetwork } from "../store/network";
import { isLikelyBech32, tmzToUtmz, utmzToTmz, shortAddress } from "../utils/format";
import { connectSigning, sendTokens } from "../wallet/client";
import { fetchBalance } from "../api/chain";
import { useToast } from "../components/Toast";
import { useSearchParams } from "react-router-dom";

const C = {
  bg:      '#0e0824',
  card:    '#1a1040',
  border:  '#2a1f5c',
  gold:    '#d4a017',
  text:    '#fdf6e3',
  muted:   '#8a8aa0',
  success: '#00c48c',
  error:   '#ff4d4d',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: '#1a1040',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '11px 14px',
  color: C.text,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: C.muted,
  marginBottom: 6,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
}

export function Send() {
  const { active, signer, locked, unlock } = useWallet();
  const { current } = useNetwork();
  const push = useToast((s) => s.push);
  const [params] = useSearchParams();

  const [to, setTo] = useState(params.get("to") ?? "");
  const [amount, setAmount] = useState(params.get("amount") ?? "");
  const [memo, setMemo] = useState(params.get("memo") ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [maxTmz, setMaxTmz] = useState<string>("0");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [toFocused, setToFocused] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);

  useEffect(() => {
    if (!active) return;
    fetchBalance(current, active.address)
      .then((bs) => {
        const b = bs.find((c) => c.denom === current.denom);
        setMaxTmz(b ? utmzToTmz(b.amount) : "0");
      })
      .catch(() => setMaxTmz("0"));
  }, [active, current]);

  const toValid = !to || isLikelyBech32(to, current.bech32Prefix);
  const canPreview =
    isLikelyBech32(to, current.bech32Prefix) &&
    Number(amount) > 0 &&
    !!active;

  const amountNum = Number(amount) || 0;
  const fee = 0.002;
  const total = amountNum + fee;

  async function onConfirm() {
    if (!active) return;
    setBusy(true);
    setTxHash(null);
    try {
      let s = signer;
      if (locked || !s) {
        await unlock(password);
        s = useWallet.getState().signer;
      }
      if (!s) throw new Error("Wallet not unlocked");
      const client = await connectSigning(current, s);
      const utmz = tmzToUtmz(amount).toString();
      const result = await sendTokens(client, active.address, to, utmz, current.denom, memo);
      if (result.code !== 0) throw new Error(result.rawLog || "tx failed");
      setTxHash(result.transactionHash);
      setShowPreview(false);
      push("success", `Sent ${amount} ${current.display}`);
    } catch (err: any) {
      push("error", err?.message ?? "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 28,
        }}
      >
        <h2 style={{ color: C.gold, fontSize: 20, fontWeight: 700, margin: '0 0 24px' }}>
          📤 Send {current.display}
        </h2>

        {/* Recipient */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL_STYLE}>Recipient Address</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{
                ...INPUT_STYLE,
                fontFamily: 'monospace',
                paddingRight: 80,
                borderColor: !toValid ? C.error : toFocused ? C.gold : C.border,
              }}
              value={to}
              onChange={(e) => setTo(e.target.value.trim())}
              onFocus={() => setToFocused(true)}
              onBlur={() => setToFocused(false)}
              placeholder={`${current.bech32Prefix}1...`}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) setTo(text.trim());
                } catch { /* denied */ }
              }}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: C.gold,
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Paste
            </button>
          </div>
          {!toValid && to && (
            <div style={{ fontSize: 11, color: C.error, marginTop: 4 }}>
              Not a valid {current.bech32Prefix} bech32 address
            </div>
          )}
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ ...LABEL_STYLE, margin: 0 }}>Amount (TMZ)</label>
            <button
              type="button"
              onClick={() => setAmount(maxTmz)}
              style={{ background: 'none', border: 'none', color: C.gold, fontSize: 12, cursor: 'pointer', padding: 0 }}
            >
              Max: {maxTmz} TMZ
            </button>
          </div>
          <input
            style={{
              ...INPUT_STYLE,
              fontFamily: 'monospace',
              borderColor: amountFocused ? C.gold : C.border,
            }}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            placeholder="0.000000"
          />
          {amount && Number(amount) > 0 && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              ≈ ${(Number(amount) * 0.12).toFixed(4)} USD
            </div>
          )}
        </div>

        {/* Memo */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL_STYLE}>Memo (optional)</label>
          <input
            style={INPUT_STYLE}
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, 256))}
            placeholder="Optional message"
          />
          <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
            {memo.length}/256 characters
          </div>
        </div>

        {/* Fee info */}
        <div
          style={{
            background: `${C.gold}10`,
            border: `1px solid ${C.gold}25`,
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 18,
            fontSize: 12,
            color: C.muted,
          }}
        >
          Network fee: <span style={{ color: C.text }}>2000 utmz ≈ 0.002 TMZ</span>
          {' · '}Gas: auto
        </div>

        {/* Password if locked */}
        {locked && (
          <div style={{ marginBottom: 18 }}>
            <label style={LABEL_STYLE}>Wallet Password</label>
            <input
              type="password"
              style={INPUT_STYLE}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter to unlock & sign"
            />
          </div>
        )}

        {/* Preview button */}
        <button
          onClick={() => setShowPreview(true)}
          disabled={!canPreview}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 10,
            background: canPreview ? C.gold : `${C.gold}40`,
            color: '#1a1040',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: canPreview ? 'pointer' : 'not-allowed',
          }}
        >
          Preview Transaction
        </button>

        {/* Success hash */}
        {txHash && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              background: `${C.success}15`,
              border: `1px solid ${C.success}40`,
              borderRadius: 8,
              fontSize: 11,
              color: C.success,
              wordBreak: 'break-all',
            }}
          >
            ✓ Transaction broadcast!
            <br />
            <span style={{ color: C.muted, fontFamily: 'monospace' }}>{txHash}</span>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
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
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false) }}
        >
          <div
            style={{
              background: '#13092e',
              border: `1px solid ${C.gold}40`,
              borderRadius: 16,
              padding: 28,
              width: 440,
              maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: C.gold, fontSize: 16, fontWeight: 700, margin: 0 }}>
                Confirm Transaction
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {[
              { label: 'From', value: shortAddress(active!.address, 10, 8) },
              { label: 'To', value: shortAddress(to, 10, 8) },
              { label: 'Amount', value: `${amount} TMZ` },
              { label: 'Fee', value: '0.002 TMZ' },
              { label: 'Total', value: `${total.toFixed(6)} TMZ` },
              ...(memo ? [{ label: 'Memo', value: memo }] : []),
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: `1px solid ${C.border}50`,
                  fontSize: 13,
                }}
              >
                <span style={{ color: C.muted }}>{row.label}</span>
                <span style={{ color: row.label === 'Total' ? C.gold : C.text, fontWeight: row.label === 'Total' ? 700 : 400, fontFamily: 'monospace' }}>
                  {row.value}
                </span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                style={{
                  flex: 2,
                  padding: '11px',
                  borderRadius: 8,
                  background: C.gold,
                  border: 'none',
                  color: '#1a1040',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? 'Broadcasting…' : 'Confirm Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
