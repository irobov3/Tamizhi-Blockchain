import { forwardRef, useMemo } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { useMessagesStore } from "../store/messages";

interface Props {
  onNewChat: () => void;
  onSettings: () => void;
}

export const Sidebar = forwardRef<HTMLInputElement, Props>(
  ({ onNewChat, onSettings }, searchRef) => {
    const {
      conversations,
      activeId,
      setActive,
      searchQuery,
      setSearch,
    } = useMessagesStore();

    const filtered = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return conversations;
      return conversations.filter(
        (c) =>
          c.peerName.toLowerCase().includes(q) ||
          c.peerAddress.toLowerCase().includes(q) ||
          (c.lastMessage ?? "").toLowerCase().includes(q)
      );
    }, [conversations, searchQuery]);

    return (
      <aside className="sidebar">
        <div className="sidebar-header">
          <input
            ref={searchRef}
            className="sidebar-search"
            placeholder="Search conversations…  (Cmd+F)"
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-new-chat" onClick={onNewChat}>
            + New chat
          </button>
        </div>
        <div className="conv-list">
          {filtered.length === 0 && (
            <div style={{ padding: 16, color: "var(--color-subtext)", fontSize: 12 }}>
              No conversations yet. Start a new chat to message someone on the
              Tamizhi network.
            </div>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`conv-item ${activeId === c.id ? "active" : ""}`}
              onClick={() => setActive(c.id)}
            >
              <div className="conv-avatar">
                {c.peerName.slice(0, 2).toUpperCase()}
              </div>
              <div className="conv-meta">
                <div className="conv-name">
                  <span>{c.peerName}</span>
                  <span className="conv-time">
                    {c.lastTimestamp
                      ? formatDistanceToNowStrict(c.lastTimestamp, {
                          addSuffix: false,
                        })
                      : ""}
                  </span>
                </div>
                <div className="conv-preview">
                  {c.lastMessage ?? "No messages yet"}
                </div>
              </div>
              {c.unread > 0 && <span className="conv-badge">{c.unread}</span>}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Online</span>
          <button
            className="btn-settings"
            onClick={onSettings}
            title="Settings (Cmd+,)"
          >
            Settings
          </button>
        </div>
      </aside>
    );
  }
);
Sidebar.displayName = "Sidebar";
