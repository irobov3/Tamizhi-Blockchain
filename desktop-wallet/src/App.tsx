import { useEffect } from "react";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ToastHost } from "./components/Toast";
import { Dashboard } from "./pages/Dashboard";
import { Send } from "./pages/Send";
import { Receive } from "./pages/Receive";
import { Staking } from "./pages/Staking";
import { History } from "./pages/History";
import { Literature } from "./pages/Literature";
import { Rewards } from "./pages/Rewards";
import { Settings } from "./pages/Settings";
import { useWallet } from "./store/wallet";

const C = {
  bg: '#0e0824',
  sidebar: '#0a0618',
  card: '#1a1040',
  border: '#2a1f5c',
  gold: '#d4a017',
  cyan: '#00d4ff',
  text: '#fdf6e3',
  muted: '#8a8aa0',
  success: '#00c48c',
  error: '#ff4d4d',
  purple: '#7c3aed',
}

function DeepLinkBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const events = await import("@tauri-apps/api/event");
        unlisten = await events.listen<{ urls: string[] }>("deep-link://new-url", (e) => {
          const url = e.payload.urls?.[0];
          if (!url) return;
          const u = new URL(url);
          if (u.hostname === "send" || u.pathname.startsWith("//send")) {
            const qs = u.searchParams.toString();
            navigate(`/send?${qs}`);
          }
        });
      } catch (err) {
        console.warn("deep-link listen failed", err);
      }
    })();
    return () => { unlisten?.(); };
  }, [navigate]);
  return null;
}

function Shell() {
  const { refresh } = useWallet();
  useEffect(() => {
    refresh();
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', background: C.bg, overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <DeepLinkBridge />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/send" element={<Send />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/staking" element={<Staking />} />
            <Route path="/history" element={<History />} />
            <Route path="/literature" element={<Literature />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
      <ToastHost />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

export { C };
