import { useEffect, useState } from "react";
import { fetchWorksByAuthor, type LiteraryWork } from "../api/chain";
import { useNetwork } from "../store/network";
import { useWallet } from "../store/wallet";
import { useToast } from "../components/Toast";

export function Literature() {
  const { active } = useWallet();
  const { current } = useNetwork();
  const push = useToast((s) => s.push);
  const [works, setWorks] = useState<LiteraryWork[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("ta");

  useEffect(() => {
    if (!active) return;
    fetchWorksByAuthor(current, active.address).then(setWorks).catch(() => setWorks([]));
  }, [active, current]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // The literature module's MsgSubmitWork is not part of stargate registry by
    // default. This stub computes a content hash and notifies the user; chain
    // submission requires registering the protobuf message in client.ts.
    const enc = new TextEncoder().encode(content);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    push("info", `SHA-256 ${hex.slice(0, 12)}… — submission pending registry wiring`);
    setTitle("");
    setContent("");
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <form onSubmit={submit} className="card space-y-3">
        <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">
          Submit new work
        </h3>
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Language</label>
          <select
            className="input"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="label">Content</label>
          <textarea
            className="input min-h-[160px] font-tamil"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={!title || !content}>
          Submit
        </button>
      </form>

      <div className="card">
        <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
          Your works
        </h3>
        {works.length === 0 ? (
          <p className="text-cream/50 text-sm">No works submitted yet.</p>
        ) : (
          works.map((w) => (
            <div key={w.id} className="py-2 border-b border-gold/10 last:border-0">
              <div className="font-medium text-cream">{w.title}</div>
              <div className="text-[10px] text-cream/40 font-mono break-all">
                {w.content_hash}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
