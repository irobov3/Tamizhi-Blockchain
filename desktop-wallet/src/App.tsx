import { useEffect } from "react";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
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
          // tamizhi://send?to=...&amount=...
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
    return () => {
      unlisten?.();
    };
  }, [navigate]);
  return null;
}

function Shell() {
  const { refresh } = useWallet();
  useEffect(() => {
    refresh();
  }, []);
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
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
