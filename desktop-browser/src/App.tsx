import { useEffect, useState } from "react";
import TabBar from "./components/TabBar";
import URLBar from "./components/URLBar";
import NavToolbar from "./components/NavToolbar";
import WebViewArea from "./components/WebViewArea";
import HomePage from "./components/HomePage";
import BookmarksManager from "./components/BookmarksManager";
import HistoryPanel from "./components/HistoryPanel";
import Settings from "./components/Settings";
import WalletPanel from "./components/WalletPanel";
import Web3PermissionModal from "./components/Web3PermissionModal";
import { useTabs } from "./store/tabs";
import { useBookmarks } from "./store/bookmarks";
import { useHistory } from "./store/history";
import { useWallet } from "./store/wallet";
import { installProviderListener, setPermissionPrompter } from "./web3/provider";
import { resolveURL } from "./utils/url";

interface PendingPrompt {
  origin: string;
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any;
  resolve: (decision: "approve" | "deny") => void;
}

export default function App() {
  const tabs = useTabs((s) => s.tabs);
  const activeTabId = useTabs((s) => s.activeTabId);
  const newTab = useTabs((s) => s.newTab);
  const navigate = useTabs((s) => s.navigate);
  const tab = tabs.find((t) => t.id === activeTabId);

  const hydrateBookmarks = useBookmarks((s) => s.hydrate);
  const hydrateHistory = useHistory((s) => s.hydrate);
  const hydrateWallet = useWallet((s) => s.hydrate);

  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    void hydrateBookmarks();
    void hydrateHistory();
    void hydrateWallet();
    installProviderListener();
    setPermissionPrompter((origin, method, params) =>
      new Promise((resolve) => {
        setPendingPrompt({
          origin,
          method,
          params,
          resolve: (d) => { setPendingPrompt(null); resolve(d); },
        });
      }),
    );
  }, [hydrateBookmarks, hydrateHistory, hydrateWallet]);

  const goHome = () => {
    if (!tab) return;
    const r = resolveURL("tamizhi://home");
    navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
  };

  // Ensure at least one tab.
  useEffect(() => {
    if (tabs.length === 0) newTab();
  }, [tabs.length, newTab]);

  return (
    <div className="flex flex-col h-screen bg-tamizhi-chrome text-white">
      <TabBar />

      <div className="flex items-center gap-1 h-11 px-2 bg-tamizhi-chrome border-b border-black/40">
        <NavToolbar onHome={goHome} />
        <URLBar />
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-8 h-8 rounded hover:bg-white/10"
            aria-label="Menu"
          >⋮</button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-tamizhi-chromeLight border border-white/10 rounded-md shadow-xl z-50 text-sm">
              {[
                ["tamizhi://wallet", "Wallet"],
                ["tamizhi://bookmarks", "Bookmarks"],
                ["tamizhi://history", "History"],
                ["tamizhi://settings", "Settings"],
              ].map(([url, label]) => (
                <button
                  key={url}
                  onClick={() => {
                    setShowMenu(false);
                    if (!tab) return;
                    const r = resolveURL(url);
                    navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-white/10"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {tab?.overlay === "home" && <HomePage />}
        {tab?.overlay === "wallet" && <WalletPanel />}
        {tab?.overlay === "bookmarks" && <BookmarksManager />}
        {tab?.overlay === "history" && <HistoryPanel />}
        {tab?.overlay === "settings" && <Settings />}
        {!tab?.overlay && tab?.loadURL && <WebViewArea />}
      </div>

      <StatusBar />

      {pendingPrompt && (
        <Web3PermissionModal
          origin={pendingPrompt.origin}
          method={pendingPrompt.method}
          params={pendingPrompt.params}
          onApprove={() => pendingPrompt.resolve("approve")}
          onDeny={() => pendingPrompt.resolve("deny")}
        />
      )}
    </div>
  );
}

function StatusBar() {
  const wallet = useWallet();
  return (
    <div className="h-6 px-3 flex items-center justify-between text-xs bg-black/40 border-t border-black/60 text-white/60">
      <div>
        {wallet.unlocked
          ? <>Wallet: <span className="text-tamizhi-accent">unlocked</span> ({(wallet.address || "").slice(0, 14)}…)</>
          : wallet.keystore
            ? <>Wallet: locked</>
            : <>No wallet</>}
      </div>
      <div>Network: tamizhi-1</div>
    </div>
  );
}
