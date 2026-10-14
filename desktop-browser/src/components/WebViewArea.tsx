import { useEffect, useRef } from "react";
import { useTabs } from "../store/tabs";
import { useHistory } from "../store/history";

export default function WebViewArea() {
  const { tabs, activeTabId, setLoading, setTitle } = useTabs();
  const tab = tabs.find((t) => t.id === activeTabId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pushHistory = useHistory((s) => s.push);

  useEffect(() => {
    if (!tab || !tab.loadURL) return;
    setLoading(tab.id, true);
    pushHistory({ url: tab.url, title: tab.url, visitedAt: Date.now() });
  }, [tab?.loadURL]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tab || !tab.loadURL) return null;

  return (
    <div className="flex-1 relative bg-white">
      <iframe
        ref={iframeRef}
        src={tab.loadURL}
        className="w-full h-full border-0"
        title={tab.title}
        onLoad={() => {
          setLoading(tab.id, false);
          // Cross-origin iframes hide their title; best effort:
          try {
            const t = iframeRef.current?.contentDocument?.title;
            if (t) setTitle(tab.id, t);
          } catch {
            // expected for cross-origin
          }
        }}
        // Sandbox keeps risky iframes from breaking the chrome.
        // Note: removing 'allow-same-origin' would also block cookies/login.
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-modals allow-downloads"
        allow="clipboard-read; clipboard-write; fullscreen"
      />
    </div>
  );
}
