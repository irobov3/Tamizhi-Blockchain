import { useEffect, useState } from "react";
import { AddressInput } from "../components/AddressInput";
import { AmountInput } from "../components/AmountInput";
import { useWallet } from "../store/wallet";
import { useNetwork } from "../store/network";
import { isLikelyBech32, tmzToUtmz, utmzToTmz } from "../utils/format";
import { connectSigning, sendTokens } from "../wallet/client";
import { fetchBalance } from "../api/chain";
import { useToast } from "../components/Toast";
import { useSearchParams } from "react-router-dom";

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

  useEffect(() => {
    if (!active) return;
    fetchBalance(current, active.address)
      .then((bs) => {
        const b = bs.find((c) => c.denom === current.denom);
        setMaxTmz(b ? utmzToTmz(b.amount) : "0");
      })
      .catch(() => setMaxTmz("0"));
  }, [active, current]);

  const valid =
    isLikelyBech32(to, current.bech32Prefix) &&
    Number(amount) > 0 &&
    !!active;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      const result = await sendTokens(
        client,
        active.address,
        to,
        utmz,
        current.denom,
        memo
      );
      if (result.code !== 0) throw new Error(result.rawLog || "tx failed");
      setTxHash(result.transactionHash);
      push("success", `Sent ${amount} ${current.display}`);
    } catch (err: any) {
      push("error", err?.message ?? "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-xl space-y-4">
      <h2 className="text-lg font-semibold text-gold">Send {current.display}</h2>
      <AddressInput value={to} onChange={setTo} prefix={current.bech32Prefix} />
      <AmountInput
        value={amount}
        onChange={setAmount}
        display={current.display}
        micro={current.denom}
        usdRate={0.12}
        max={maxTmz}
      />
      <div>
        <label className="label">Memo (optional)</label>
        <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div className="text-xs text-cream/50 border border-gold/10 rounded-lg p-3 bg-indigo-night/40">
        Estimated network fee: ~0.005 {current.display} · Gas auto
      </div>
      {locked && (
        <div>
          <label className="label">Wallet password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter to unlock & sign"
          />
        </div>
      )}
      <button type="submit" className="btn-primary w-full" disabled={!valid || busy}>
        {busy ? "Broadcasting…" : "Send"}
      </button>
      {txHash && (
        <div className="text-xs text-green-400 break-all">
          Success — tx hash: {txHash}
        </div>
      )}
    </form>
  );
}
