import { useState } from "react";
import { useTabs } from "../store/tabs";
import { useBookmarks } from "../store/bookmarks";
import { useHistory } from "../store/history";
import { resolveURL } from "../utils/url";

export default function HomePage() {
  const { tabs, activeTabId, navigate } = useTabs();
  const tab = tabs.find((t) => t.id === activeTabId);
  const bookmarks = useBookmarks((s) => s.items);
  const recents = useHistory((s) => s.items.slice(0, 8));
  const [q, setQ] = useState("");

  if (!tab) return null;

  const go = (url: string) => {
    const r = resolveURL(url);
    navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
  };

  const search = () => {
    if (!q.trim()) return;
    const r = resolveURL(q);
    navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-tamizhi-chrome to-black p-10 text-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-full border-2 border-tamizhi-accent flex items-center justify-center mb-4 bg-black/40">
            <span className="text-4xl text-tamizhi-accent font-bold">த</span>
          </div>
          <h1 className="text-2xl font-light">Tamizhi Browser</h1>
          <p className="text-white/50 text-sm mt-1">Web3-native browsing for the Tamizhi network</p>
        </div>

        <div className="flex gap-2 mb-10">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="Search the web or enter URL"
            className="flex-1 h-11 px-4 rounded-full bg-black/40 border border-white/10 focus:border-tamizhi-accent outline-none text-sm"
          />
          <button
            onClick={search}
            className="px-5 h-11 rounded-full bg-tamizhi-accent text-tamizhi-chrome font-medium text-sm"
          >Go</button>
        </div>

        <h2 className="text-xs uppercase tracking-wider text-white/50 mb-3">Bookmarks</h2>
        <div className="grid grid-cols-4 gap-3 mb-10">
          {bookmarks.length === 0 && (
            <div className="col-span-4 text-white/40 text-sm">No bookmarks yet — visit a site and click the star.</div>
          )}
          {bookmarks.slice(0, 12).map((b) => (
            <button
              key={b.id}
              onClick={() => go(b.url)}
              className="bg-black/30 hover:bg-tamizhi-chromeLight rounded-lg p-3 text-left border border-white/5"
            >
              <div className="truncate text-sm">{b.title || b.url}</div>
              <div className="truncate text-xs text-white/40">{b.url}</div>
            </button>
          ))}
        </div>

        <h2 className="text-xs uppercase tracking-wider text-white/50 mb-3">Recent</h2>
        <div className="space-y-1">
          {recents.length === 0 && (
            <div className="text-white/40 text-sm">No recent history.</div>
          )}
          {recents.map((h, i) => (
            <button
              key={i}
              onClick={() => go(h.url)}
              className="block w-full text-left px-3 py-1.5 rounded hover:bg-white/5 text-sm"
            >
              <span className="text-white/80">{h.title || h.url}</span>
              <span className="text-white/40 ml-2 text-xs">{h.url}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
