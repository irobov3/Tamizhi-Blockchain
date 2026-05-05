import { useMessagesStore } from "../store/messages";

export function ContactInfo() {
  const { activeId, conversations, messages } = useMessagesStore();
  const conv = conversations.find((c) => c.id === activeId);
  if (!conv) {
    return (
      <aside className="info">
        <div style={{ color: "var(--color-subtext)", fontSize: 12, padding: 8 }}>
          Select a conversation to see details.
        </div>
      </aside>
    );
  }
  const msgs = messages[conv.id] ?? [];
  const sharedFiles = msgs.flatMap((m) => m.attachments ?? []);

  return (
    <aside className="info">
      <div className="info-avatar">
        {conv.peerName.slice(0, 2).toUpperCase()}
      </div>
      <div className="info-name">{conv.peerName}</div>
      <div className="info-addr">{conv.peerAddress}</div>

      <div className="info-section">
        <h4>Shared media ({sharedFiles.length})</h4>
        <div className="shared-grid">
          {sharedFiles.length === 0 && (
            <div style={{ gridColumn: "1 / -1", color: "var(--color-subtext)", fontSize: 11 }}>
              No files shared yet.
            </div>
          )}
          {sharedFiles.slice(0, 9).map((f, i) => (
            <div key={i} className="shared-tile" title={f.name}>
              {f.name.split(".").pop()?.toUpperCase() ?? "FILE"}
            </div>
          ))}
        </div>
      </div>

      <div className="info-section">
        <h4>Actions</h4>
        <div className="info-actions">
          <button>{conv.muted ? "Unmute" : "Mute"} notifications</button>
          <button>Clear chat history</button>
          <button className="danger">Block contact</button>
        </div>
      </div>
    </aside>
  );
}
