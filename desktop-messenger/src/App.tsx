import { useEffect, useRef } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { ContactInfo } from "./components/ContactInfo";
import { useShortcuts } from "./hooks/useShortcuts";
import { useMessagesStore } from "./store/messages";

export default function App() {
  const searchRef = useRef<HTMLInputElement>(null);
  const { showInfo, toggleInfo, setActive, upsertConversation, appendMessage } =
    useMessagesStore();

  useShortcuts({
    onNewChat: () => {
      const peer = window.prompt("Recipient address (tmz1…)");
      if (!peer) return;
      const id = `conv-${peer}`;
      upsertConversation({
        id,
        peerAddress: peer,
        peerName: peer.slice(0, 12),
        unread: 0,
      });
      setActive(id);
    },
    onSearch: () => searchRef.current?.focus(),
    onSettings: () => alert("Settings — coming soon"),
    onToggleInfo: () => toggleInfo(),
    onCloseChat: () => setActive(null),
  });

  // Seed with a demo conversation on first run so the app isn't empty.
  useEffect(() => {
    const state = useMessagesStore.getState();
    if (state.conversations.length === 0) {
      const id = "conv-demo";
      upsertConversation({
        id,
        peerAddress: "tmz1demo000000000000000000000000000000000",
        peerName: "Tamizhi Bot",
        unread: 0,
      });
      appendMessage({
        id: "m1",
        conversationId: id,
        from: "tmz1demo000000000000000000000000000000000",
        to: "me",
        body: "வணக்கம்! Welcome to **Tamizhi** Messenger desktop. Drag a file here to attach it, or press `Cmd+N` to start a new chat.",
        timestamp: Date.now() - 60000,
        status: "delivered",
      });
      state.setMyAddress("me");
    }
  }, [appendMessage, upsertConversation]);

  return (
    <div className="app-shell">
      <TitleBar />
      <div className={`app-body ${showInfo ? "" : "no-info"}`}>
        <Sidebar
          ref={searchRef}
          onNewChat={() => {
            const peer = window.prompt("Recipient address (tmz1…)");
            if (!peer) return;
            const id = `conv-${peer}`;
            upsertConversation({
              id,
              peerAddress: peer,
              peerName: peer.slice(0, 12),
              unread: 0,
            });
            setActive(id);
          }}
          onSettings={() => alert("Settings — coming soon")}
        />
        <ChatView />
        {showInfo && <ContactInfo />}
      </div>
    </div>
  );
}
