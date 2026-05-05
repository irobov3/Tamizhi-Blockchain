import { useMemo, useState } from 'react';
import { useConversations } from '../store/conversations';

interface Props {
  onClose: () => void;
}

interface Item {
  id: string;
  label: string;
  action: () => void;
}

export default function CommandPalette({ onClose }: Props) {
  const { conversations, setActive, newConversation } = useConversations();
  const [query, setQuery] = useState('');

  const items: Item[] = useMemo(() => {
    const base: Item[] = [
      {
        id: 'cmd:new',
        label: 'New chat',
        action: () => {
          newConversation();
          onClose();
        },
      },
    ];
    const conv: Item[] = conversations.map((c) => ({
      id: c.id,
      label: c.title || 'Untitled',
      action: () => {
        setActive(c.id);
        onClose();
      },
    }));
    return [...base, ...conv];
  }, [conversations, newConversation, setActive, onClose]);

  const filtered = items.filter((it) => it.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Search commands and conversations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="palette-input"
        />
        <div className="palette-list">
          {filtered.map((it) => (
            <div key={it.id} className="palette-item" onClick={it.action}>
              {it.label}
            </div>
          ))}
          {filtered.length === 0 && <div className="palette-empty">No matches</div>}
        </div>
      </div>
    </div>
  );
}
