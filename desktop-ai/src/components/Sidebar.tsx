import { useState } from 'react'
import { useStore } from '../store'
import type { Conversation } from '../types'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

function getPreview(conv: Conversation): string {
  const lastMsg = [...conv.messages].reverse().find((m) => m.content.trim())
  return lastMsg ? lastMsg.content.slice(0, 50) : 'No messages yet'
}

export default function Sidebar() {
  const conversations = useStore((s) => s.conversations)
  const activeConversationId = useStore((s) => s.activeConversationId)
  const createConversation = useStore((s) => s.createConversation)
  const setActiveConversation = useStore((s) => s.setActiveConversation)
  const deleteConversation = useStore((s) => s.deleteConversation)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const model = useStore((s) => s.model)
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filtered = [...conversations]
    .filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const modelShort = model.includes('sonnet') ? 'claude-3-5-sonnet' : 'claude-3-haiku'

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        background: '#0d0d25',
        borderRight: '1px solid #1e1e4a',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 14px 12px' }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#7c3aed',
            marginBottom: 12,
            letterSpacing: '-0.3px',
          }}
        >
          தமிழி AI
        </div>
        <button
          onClick={() => createConversation()}
          style={{
            width: '100%',
            background: '#7c3aed',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            padding: '9px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 10,
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = '#6d28d9')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = '#7c3aed')
          }
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Chat
        </button>

        {/* Search */}
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          style={{
            width: '100%',
            background: '#111130',
            border: '1px solid #1e1e4a',
            borderRadius: 7,
            color: '#f0f0ff',
            padding: '7px 10px',
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Conversations list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 8px' }}>
        {filtered.length === 0 && (
          <div
            style={{
              color: '#6060a0',
              fontSize: 12,
              textAlign: 'center',
              padding: '24px 12px',
            }}
          >
            No conversations found
          </div>
        )}
        {filtered.map((conv) => {
          const isActive = conv.id === activeConversationId
          const isHovered = hoveredId === conv.id
          return (
            <div
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: 7,
                marginBottom: 2,
                background: isActive ? '#1a1050' : isHovered ? '#111130' : 'transparent',
                borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
                position: 'relative',
                transition: 'background 0.1s',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  color: '#f0f0ff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingRight: isHovered ? 24 : 0,
                }}
              >
                {conv.title.slice(0, 30) || 'Untitled'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#6060a0',
                  marginTop: 3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getPreview(conv)}
              </div>
              <div style={{ fontSize: 11, color: '#6060a0', marginTop: 2 }}>
                {formatTime(conv.updatedAt)}
              </div>

              {/* Delete button on hover */}
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conv.id)
                  }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#ff5577',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                  title="Delete conversation"
                >
                  🗑
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid #1e1e4a',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              background: '#1e1e4a',
              color: '#7c3aed',
              borderRadius: 5,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {modelShort}
          </span>
          <button
            onClick={toggleSettings}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6060a0',
              cursor: 'pointer',
              fontSize: 18,
              padding: '2px 4px',
              lineHeight: 1,
            }}
            title="Settings (Cmd+,)"
          >
            ⚙️
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#6060a0', textAlign: 'center' }}>
          Powered by Anthropic
        </div>
      </div>
    </aside>
  )
}
