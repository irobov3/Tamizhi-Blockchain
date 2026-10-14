import { useBookmarks } from "../store/bookmarks";
import { useTabs } from "../store/tabs";
import { resolveURL } from "../utils/url";

export default function BookmarksManager() {
  const { items, remove, update } = useBookmarks();
  const { tabs, activeTabId, navigate } = useTabs();
  const tab = tabs.find((t) => t.id === activeTabId);

  const open = (url: string) => {
    if (!tab) return;
    const r = resolveURL(url);
    navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
  };

  return (
    <div className="h-full overflow-y-auto bg-tamizhi-chrome p-8 text-white">
      <h1 className="text-xl font-light mb-6">Bookmarks</h1>
      {items.length === 0 && <p className="text-white/50">No bookmarks yet.</p>}
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="flex items-center gap-3 bg-black/30 rounded p-3 border border-white/5">
            <div className="flex-1 min-w-0">
              <input
                value={b.title}
                onChange={(e) => update(b.id, { title: e.target.value })}
                className="bg-transparent w-full text-sm font-medium outline-none"
              />
              <button onClick={() => open(b.url)} className="text-xs text-tamizhi-accent hover:underline truncate block text-left">
                {b.url}
              </button>
            </div>
            <button onClick={() => remove(b.id)} className="text-white/50 hover:text-red-400 text-sm">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
