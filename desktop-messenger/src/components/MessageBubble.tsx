import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { Message } from "../store/messages";

export function MessageBubble({
  message,
  mine,
}: {
  message: Message;
  mine: boolean;
}) {
  return (
    <div className={`bubble-row ${mine ? "sent" : "received"}`}>
      <div className="bubble">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p>{children}</p>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {message.body}
        </ReactMarkdown>
        {message.attachments && message.attachments.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.85 }}>
            {message.attachments.map((a, i) => (
              <div key={i}>
                attachment: {a.name} ({Math.round(a.size / 1024)} KB)
              </div>
            ))}
          </div>
        )}
        <div className="meta">
          <span>{format(message.timestamp, "HH:mm")}</span>
          {mine && <span>{statusGlyph(message.status)}</span>}
        </div>
      </div>
    </div>
  );
}

function statusGlyph(status: Message["status"]): string {
  switch (status) {
    case "pending":
      return "…";
    case "sent":
      return "✓";
    case "delivered":
      return "✓✓";
    case "read":
      return "✓✓";
    case "failed":
      return "!";
  }
}
