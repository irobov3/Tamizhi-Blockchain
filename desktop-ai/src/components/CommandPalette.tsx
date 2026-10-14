import { useMemo, useState } from 'react'
import { useStore } from '../store'

interface Props {
  onClose: () => void
}

interface Item {
  id: string
  label: string
  sublabel?: string
  action: () => void
}

export default function CommandPalette({ onClose }: Props) {
  const conversations = useStore((s) => s.conversations)
  const createConversation = useStore((s) => s.createConversation)
  const setActiveConversation = useStore((s) => s.setActiveConversation)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const [query, setQuery] = useState('')

  const items: Item[] = useMemo(() => {
    const base: Item[] = [
      {
        id: 'cmd:new',
        label: '+ New conversation',
        action: () => {
          createConversation()
          onClose()
        },
      },
      {
        id: 'cmd:settings',
        label: '⚙️ Open Settings',
        sublabel: 'Cmd+,',
        action: () => {
          toggleSettings()
          onClose()
        },
      },
    ]
    const convItems: Item[] = [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((c) => ({
        id: c.id,
        label: c.title || 'Untitled',
        sublabel: `${c.messages.length} message${c.messages.length !== 1 ? 's' : ''}`,
        action: () => {
          setActiveConversation(c.id)
          onClose()
        },
      }))
    return [...base, ...convItems]
  }, [conversations, createConversation, setActiveConversation, toggleSettings, onClose])

  const filtered = items.filter((it) =>
    it.label.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 100,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: '90vw',
          background: '#0d0d25',
          border: '1px solid #1e1e4a',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commands and conversations..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #1e1e4a',
            borderRadius: 0,
            color: '#f0f0ff',
            padding: '16px 18px',
            fontSize: 15,
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filtered.map((it, i) => (
            <div
              key={it.id}
              onClick={it.action}
              style={{
                padding: '11px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: i < filtered.length - 1 ? '1px solid #0f0f2a' : 'none',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = '#111130')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
              }
            >
              <span style={{ fontSize: 13, color: '#f0f0ff' }}>{it.label}</span>
              {it.sublabel && (
                <span style={{ fontSize: 11, color: '#6060a0' }}>{it.sublabel}</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: '#6060a0',
                fontSize: 13,
              }}
            >
              No matches
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
