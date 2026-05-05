import { useState, useMemo } from "react";
import { useHistory } from "../store/history";
import { useTabs } from "../store/tabs";
import { resolveURL } from "../utils/url";

export default function HistoryPanel() {
  const { items, clear } = useHistory();
  const { tabs, activeTabId, navigate } = useTabs();
  const tab = tabs.find((t) => t.id === activeTabId);
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const filtered = q
      ? items.filter((h) => h.url.toLowerCase().includes(q.toLowerCase()) || (h.title || "").toLowerCase().includes(q.toLowerCase()))
      : items;
    const map = new Map<string, typeof items>();
    for (const h of filtered) {
      const day = new Date(h.visitedAt).toDateString();
      const arr = map.get(day) ?? [];
      arr.push(h);
      map.set(day, arr);
    }
    return Array.from(map.entries());
  }, [items, q]);

  const open = (url: string) => {
    if (!tab) return;
    const r = resolveURL(url);
    navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
  };

  return (
    <div className="h-full overflow-y-auto bg-tamizhi-chrome p-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-light">History</h1>
        <button onClick={clear} className="text-sm px-3 h-8 rounded bg-white/10 hover:bg-white/20">Clear all</button>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search history…"
        className="w-full h-9 px-3 mb-6 rounded bg-black/30 border border-white/10 outline-none text-sm"
      />
      {grouped.map(([day, entries]) => (
        <div key={day} className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-white/50 mb-2">{day}</h2>
          {entries.map((h, i) => (
            <button
              key={i}
              onClick={() => open(h.url)}
              className="block w-full text-left px-3 py-1.5 rounded hover:bg-white/5 text-sm"
            >
              <span className="text-white/80 mr-2">{h.title || h.url}</span>
              <span className="text-xs text-white/40">{h.url}</span>
            </button>
          ))}
        </div>
      ))}
      {grouped.length === 0 && <p className="text-white/50">No history.</p>}
    </div>
  );
}
