import { useMemo, useState } from 'react';
import { useConversations } from '../store/conversations';
import { isToday, isYesterday, differenceInDays } from 'date-fns';

interface Props {
  onOpenSettings: () => void;
}

type Bucket = 'Today' | 'Yesterday' | 'Last 7 days' | 'Older';

function bucketFor(ts: number): Bucket {
  const d = new Date(ts);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (differenceInDays(new Date(), d) <= 7) return 'Last 7 days';
  return 'Older';
}

export default function Sidebar({ onOpenSettings }: Props) {
  const { conversations, activeId, newConversation, setActive, deleteConversation } =
    useConversations();
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(query.toLowerCase()),
    );
    const order: Bucket[] = ['Today', 'Yesterday', 'Last 7 days', 'Older'];
    const map = new Map<Bucket, typeof conversations>();
    order.forEach((b) => map.set(b, []));
    [...filtered]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((c) => map.get(bucketFor(c.updatedAt))!.push(c));
    return order.map((b) => [b, map.get(b)!] as const).filter(([, arr]) => arr.length > 0);
  }, [conversations, query]);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="new-chat-btn" onClick={() => newConversation()}>
          + New chat
        </button>
        <input
          className="search-input"
          placeholder="Search conversations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="conversation-list">
        {grouped.map(([bucket, items]) => (
          <div key={bucket} className="bucket">
            <div className="bucket-label">{bucket}</div>
            {items.map((c) => (
              <div
                key={c.id}
                className={`conv-item ${activeId === c.id ? 'active' : ''}`}
                onClick={() => setActive(c.id)}
              >
                <span className="conv-title">{c.title || 'Untitled'}</span>
                <button
                  className="conv-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  title="Delete"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="settings-btn" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </aside>
  );
}
