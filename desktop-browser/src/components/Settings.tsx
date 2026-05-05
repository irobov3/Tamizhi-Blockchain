import { useEffect, useState } from "react";
import { loadKey, saveKey } from "../store/persist";
import { useHistory } from "../store/history";
import { useBookmarks } from "../store/bookmarks";
import { DEFAULT_IPFS_GATEWAY } from "../utils/url";

export default function Settings() {
  const [ipfsGateway, setIpfsGateway] = useState(DEFAULT_IPFS_GATEWAY);
  const [searchEngine, setSearchEngine] = useState("https://duckduckgo.com/?q=");
  const clearHistory = useHistory((s) => s.clear);
  const setBookmarks = (items: ReturnType<typeof useBookmarks.getState>["items"]) => {
    useBookmarks.setState({ items });
    void saveKey("bookmarks/v1", items);
  };

  useEffect(() => {
    void loadKey<string>("settings/ipfsGateway", DEFAULT_IPFS_GATEWAY).then(setIpfsGateway);
    void loadKey<string>("settings/searchEngine", "https://duckduckgo.com/?q=").then(setSearchEngine);
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-tamizhi-chrome p-8 text-white">
      <h1 className="text-xl font-light mb-6">Settings</h1>
      <div className="space-y-6 max-w-xl">
        <div>
          <label className="block text-sm mb-1">Default search engine</label>
          <input
            value={searchEngine}
            onChange={(e) => { setSearchEngine(e.target.value); void saveKey("settings/searchEngine", e.target.value); }}
            className="w-full h-9 px-3 rounded bg-black/30 border border-white/10 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">IPFS gateway</label>
          <input
            value={ipfsGateway}
            onChange={(e) => { setIpfsGateway(e.target.value); void saveKey("settings/ipfsGateway", e.target.value); }}
            className="w-full h-9 px-3 rounded bg-black/30 border border-white/10 outline-none text-sm"
          />
        </div>
        <div className="pt-4 border-t border-white/10">
          <h2 className="font-medium mb-3">Privacy</h2>
          <div className="flex gap-2">
            <button onClick={clearHistory} className="px-3 h-9 rounded bg-white/10 hover:bg-white/20 text-sm">Clear history</button>
            <button onClick={() => setBookmarks([])} className="px-3 h-9 rounded bg-white/10 hover:bg-white/20 text-sm">Clear bookmarks</button>
          </div>
        </div>
      </div>
    </div>
  );
}
