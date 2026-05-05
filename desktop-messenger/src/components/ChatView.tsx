import {
  DragEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMessagesStore } from "../store/messages";
import { useMessages } from "../hooks/useMessages";
import { MessageBubble } from "./MessageBubble";

export function ChatView() {
  const { activeId, conversations, messages, myAddress, toggleInfo } =
    useMessagesStore();
  const { sendMessage } = useMessages();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const conv = conversations.find((c) => c.id === activeId);
  const list = activeId ? messages[activeId] ?? [] : [];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [list.length, activeId]);

  if (!conv) {
    return (
      <main className="chat">
        <div className="empty">
          <div className="logo">தமிழி</div>
          <div>Select a conversation or start a new chat (Cmd+N)</div>
        </div>
      </main>
    );
  }

  const onSend = async () => {
    if (!text.trim() && pending.length === 0) return;
    await sendMessage(text, pending);
    setText("");
    setPending([]);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setPending((p) => [...p, ...files]);
  };

  const wrap = (prefix: string, suffix = prefix) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = text.slice(0, start);
    const sel = text.slice(start, end) || "text";
    const after = text.slice(end);
    setText(`${before}${prefix}${sel}${suffix}${after}`);
    requestAnimationFrame(() => ta.focus());
  };

  return (
    <main
      className="chat"
      style={{ position: "relative" }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {dragOver && <div className="dropzone-overlay">Drop files to attach</div>}
      <header className="chat-header">
        <div className="conv-avatar">
          {conv.peerName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="name">{conv.peerName}</div>
          <div className="presence">online · end-to-end encrypted</div>
        </div>
        <div className="chat-actions">
          <button title="Voice call">Call</button>
          <button title="Video call">Video</button>
          <button title="Toggle info (Cmd+I)" onClick={toggleInfo}>
            Info
          </button>
        </div>
      </header>

      <div className="message-list" ref={listRef}>
        {list.length === 0 && (
          <div style={{ color: "var(--color-subtext)", textAlign: "center", marginTop: 40 }}>
            No messages yet. Say வணக்கம்!
          </div>
        )}
        {list.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            mine={m.from === myAddress || m.from === "me"}
          />
        ))}
      </div>

      <div className="composer">
        <div className="format-toolbar">
          <button onClick={() => wrap("**")} title="Bold (Cmd+B)">
            <b>B</b>
          </button>
          <button onClick={() => wrap("_")} title="Italic">
            <i>I</i>
          </button>
          <button onClick={() => wrap("`")} title="Code">
            {"<>"}
          </button>
          <button onClick={() => wrap("[", "](url)")} title="Link">
            link
          </button>
          {pending.length > 0 && (
            <span style={{ marginLeft: "auto" }}>
              {pending.length} file(s) attached
            </span>
          )}
        </div>
        <div className="composer-row">
          <button
            className="icon-btn"
            title="Attach"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.onchange = () => {
                if (input.files) {
                  setPending((p) => [...p, ...Array.from(input.files!)]);
                }
              };
              input.click();
            }}
          >
            📎
          </button>
          <button
            className="icon-btn"
            title="Emoji"
            onClick={() => setText((t) => t + " 😊")}
          >
            😊
          </button>
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a message…  (Enter to send, Shift+Enter for newline)"
            rows={1}
          />
          <button
            className="btn-send"
            onClick={onSend}
            disabled={!text.trim() && pending.length === 0}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
