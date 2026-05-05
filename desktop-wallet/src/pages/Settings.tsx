import { useEffect, useState } from "react";
import { useNetwork, NETWORKS } from "../store/network";
import { useWallet } from "../store/wallet";
import {
  createWallet,
  deleteWallet,
  exportMnemonic,
  generateMnemonic,
  renameWallet,
} from "../wallet/keystore";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";

export function Settings() {
  const { current, setNetwork, setCustom } = useNetwork();
  const { wallets, refresh, setActive, active } = useWallet();
  const push = useToast((s) => s.push);

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  // create state
  const [newName, setNewName] = useState("Main");
  const [newPassword, setNewPassword] = useState("");
  const [newMnemonic, setNewMnemonic] = useState("");

  // import state
  const [impName, setImpName] = useState("Imported");
  const [impMnemonic, setImpMnemonic] = useState("");
  const [impPassword, setImpPassword] = useState("");

  // backup state
  const [bakPassword, setBakPassword] = useState("");
  const [bakResult, setBakResult] = useState<string | null>(null);

  // language / autolock
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [autoLockMin, setAutoLockMin] = useState(15);

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    try {
      const m = newMnemonic.trim() || (await generateMnemonic(24));
      setNewMnemonic(m);
      const w = await createWallet({ name: newName, mnemonic: m, password: newPassword });
      push("success", `Wallet ${w.name} created`);
      await refresh();
      setShowCreate(false);
      setNewMnemonic("");
      setNewPassword("");
    } catch (err: any) {
      push("error", err?.message ?? "Create failed");
    }
  }

  async function handleImport() {
    try {
      const w = await createWallet({
        name: impName,
        mnemonic: impMnemonic,
        password: impPassword,
      });
      push("success", `Wallet ${w.name} imported`);
      await refresh();
      setShowImport(false);
      setImpMnemonic("");
      setImpPassword("");
    } catch (err: any) {
      push("error", err?.message ?? "Import failed");
    }
  }

  async function handleBackup() {
    if (!active) return;
    try {
      const m = await exportMnemonic(active.id, bakPassword);
      setBakResult(m);
    } catch (err: any) {
      push("error", "Wrong password");
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card">
        <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
          Network
        </h3>
        <div className="flex gap-2 flex-wrap">
          {Object.values(NETWORKS).map((n) => (
            <button
              key={n.id}
              onClick={() => setNetwork(n.id)}
              className={current.id === n.id ? "btn-primary" : "btn-secondary"}
            >
              {n.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Custom RPC</label>
            <input
              className="input"
              defaultValue={current.rpc}
              onBlur={(e) =>
                setCustom({ ...current, id: "custom", label: "Custom", rpc: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Custom REST</label>
            <input
              className="input"
              defaultValue={current.rest}
              onBlur={(e) =>
                setCustom({ ...current, id: "custom", label: "Custom", rest: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">
            Wallets
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
              Create
            </button>
            <button onClick={() => setShowImport(true)} className="btn-secondary text-xs">
              Import
            </button>
          </div>
        </div>
        {wallets.length === 0 && (
          <p className="text-cream/50 text-sm">No wallets yet — create or import one.</p>
        )}
        {wallets.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between py-2 border-b border-gold/10 last:border-0"
          >
            <div className="min-w-0">
              <input
                defaultValue={w.name}
                onBlur={async (e) => {
                  if (e.target.value && e.target.value !== w.name) {
                    await renameWallet(w.id, e.target.value);
                    refresh();
                  }
                }}
                className="bg-transparent border-b border-transparent hover:border-gold/30 focus:border-gold focus:outline-none text-cream font-medium"
              />
              <div className="text-[10px] font-mono text-cream/40 truncate">
                {w.address}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActive(w.id)}
                className={`text-xs ${
                  active?.id === w.id ? "text-gold" : "btn-ghost"
                }`}
              >
                {active?.id === w.id ? "Active" : "Use"}
              </button>
              <button
                onClick={() => setShowBackup(true)}
                className="btn-ghost text-xs"
              >
                Backup
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Delete wallet ${w.name}?`)) {
                    await deleteWallet(w.id);
                    refresh();
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
          Security & Preferences
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Auto-lock (minutes)</label>
            <input
              type="number"
              className="input"
              value={autoLockMin}
              onChange={(e) => setAutoLockMin(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Language</label>
            <select
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
            >
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card text-xs text-cream/50">
        Tamizhi Wallet · v0.1.0 · Built with Tauri 2 + React.
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create new wallet"
      >
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Wallet name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            className="btn-secondary w-full text-xs"
            onClick={async () => setNewMnemonic(await generateMnemonic(24))}
          >
            Generate 24-word mnemonic
          </button>
          {newMnemonic && (
            <div className="text-xs font-mono p-3 bg-indigo-deep border border-gold/30 rounded-lg break-words">
              {newMnemonic}
            </div>
          )}
          <button
            className="btn-primary w-full"
            onClick={handleCreate}
            disabled={!newName || !newPassword}
          >
            Create
          </button>
        </div>
      </Modal>

      <Modal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import wallet"
      >
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Wallet name"
            value={impName}
            onChange={(e) => setImpName(e.target.value)}
          />
          <textarea
            className="input min-h-[100px] font-mono"
            placeholder="Mnemonic (12 or 24 words)"
            value={impMnemonic}
            onChange={(e) => setImpMnemonic(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="Password (encrypts on disk)"
            value={impPassword}
            onChange={(e) => setImpPassword(e.target.value)}
          />
          <button
            className="btn-primary w-full"
            onClick={handleImport}
            disabled={!impMnemonic || !impPassword}
          >
            Import
          </button>
        </div>
      </Modal>

      <Modal
        open={showBackup}
        onClose={() => {
          setShowBackup(false);
          setBakResult(null);
          setBakPassword("");
        }}
        title="Backup mnemonic"
      >
        <div className="space-y-3">
          {!bakResult ? (
            <>
              <input
                type="password"
                className="input"
                placeholder="Wallet password"
                value={bakPassword}
                onChange={(e) => setBakPassword(e.target.value)}
              />
              <button onClick={handleBackup} className="btn-primary w-full">
                Reveal
              </button>
            </>
          ) : (
            <div className="text-xs font-mono p-3 bg-indigo-deep border border-gold/30 rounded-lg break-words">
              {bakResult}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
