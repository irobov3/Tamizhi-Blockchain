import { useState } from "react";
import { useWallet } from "../store/wallet";
import { Bip39, Random } from "@cosmjs/crypto";

export default function WalletPanel() {
  const { keystore, unlocked, address, create, unlock, lock } = useWallet();
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "import">("create");

  const generateMnemonic = () => {
    const entropy = Random.getBytes(16);
    setMnemonic(Bip39.encode(entropy).toString());
  };

  const onCreate = async () => {
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirmPw) return setError("Passwords do not match");
    if (!mnemonic.trim()) return setError("Mnemonic is required");
    try {
      await create(mnemonic.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onUnlock = async () => {
    setError(null);
    try {
      await unlock(password);
    } catch (e) {
      setError("Invalid password");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-tamizhi-chrome p-8 text-white">
      <div className="max-w-xl">
        <h1 className="text-xl font-light mb-6">Wallet</h1>

        {keystore && unlocked && (
          <div className="space-y-4">
            <div className="bg-black/30 rounded p-4 border border-tamizhi-accent/30">
              <div className="text-xs text-white/50 mb-1">Active address</div>
              <div className="font-mono text-sm break-all">{address}</div>
            </div>
            <button onClick={lock} className="px-4 h-9 rounded bg-white/10 hover:bg-white/20 text-sm">Lock wallet</button>
          </div>
        )}

        {keystore && !unlocked && (
          <div className="space-y-4">
            <p className="text-white/70 text-sm">Enter your password to unlock the wallet.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-10 px-3 rounded bg-black/30 border border-white/10 outline-none"
            />
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <button onClick={onUnlock} className="px-4 h-9 rounded bg-tamizhi-accent text-tamizhi-chrome font-medium text-sm">Unlock</button>
          </div>
        )}

        {!keystore && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setMode("create")} className={`px-3 h-8 rounded text-sm ${mode === "create" ? "bg-tamizhi-accent text-tamizhi-chrome" : "bg-white/10"}`}>Create new</button>
              <button onClick={() => setMode("import")} className={`px-3 h-8 rounded text-sm ${mode === "import" ? "bg-tamizhi-accent text-tamizhi-chrome" : "bg-white/10"}`}>Import</button>
            </div>

            {mode === "create" && (
              <div>
                <button onClick={generateMnemonic} className="px-3 h-9 rounded bg-white/10 hover:bg-white/20 text-sm mb-3">Generate mnemonic</button>
              </div>
            )}

            <textarea
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              placeholder="12-word seed phrase"
              rows={3}
              className="w-full px-3 py-2 rounded bg-black/30 border border-white/10 outline-none text-sm font-mono"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full h-10 px-3 rounded bg-black/30 border border-white/10 outline-none"
            />
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm password"
              className="w-full h-10 px-3 rounded bg-black/30 border border-white/10 outline-none"
            />
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <button onClick={onCreate} className="px-4 h-9 rounded bg-tamizhi-accent text-tamizhi-chrome font-medium text-sm">
              {mode === "create" ? "Create wallet" : "Import wallet"}
            </button>
            <p className="text-xs text-white/50">
              The mnemonic is encrypted with your password using PBKDF2-SHA256 (250k iterations) + AES-GCM and stored locally.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
