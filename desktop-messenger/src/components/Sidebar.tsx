import React, { useMemo, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { useStore, MY_ADDRESS } from '../store'
import { Contact } from '../types'

function truncAddr(addr: string) {
  if (addr.length <= 20) return addr
  return addr.slice(0, 10) + '…' + addr.slice(-6)
}

function formatTime(ts?: number): string {
  if (!ts) return ''
  try {
    const diff = Date.now() - ts
    if (diff < 60_000) return 'now'
    return formatDistanceToNowStrict(ts, { addSuffix: false })
  } catch {
    return ''
  }
}

export function Sidebar() {
  const { contacts, activeContactId, setActiveContact, wallet, searchQuery, setSearch } =
    useStore()
  const [hovered, setHovered] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q)
    )
  }, [contacts, searchQuery])

  const totalUnread = contacts.reduce((sum, c) => sum + c.unreadCount, 0)

  const handleNewChat = () => {
    const peer = window.prompt('Recipient address (tamizhi1…)')
    if (!peer?.trim()) return
    alert(`New chat with ${peer} — coming soon!`)
  }

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: '#0f0a2a',
        borderRight: '1px solid #2a1f5c',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 14px 10px',
          borderBottom: '1px solid #2a1f5c',
          flexShrink: 0,
        }}
      >
        {/* Logo row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #d4a017)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 900,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            த
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed' }}>
                தமிழி
              </span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fdf6e3' }}>
                Messenger
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#8a8aa0',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {truncAddr(wallet.address ?? MY_ADDRESS)}
            </div>
          </div>
          {totalUnread > 0 && (
            <div
              style={{
                background: '#dc2626',
                color: '#fff',
                borderRadius: 10,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {totalUnread}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8a8aa0',
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          <input
            style={{
              width: '100%',
              background: '#1a1040',
              border: '1px solid #2a1f5c',
              borderRadius: 8,
              padding: '7px 10px 7px 30px',
              fontSize: 13,
              color: '#fdf6e3',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="Search contacts…"
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: 16,
              color: '#8a8aa0',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            No contacts match your search.
          </div>
        )}
        {filtered.map((c) => (
          <ContactRow
            key={c.id}
            contact={c}
            active={c.id === activeContactId}
            hovered={hovered === c.id}
            onHover={(id) => setHovered(id)}
            onClick={() => setActiveContact(c.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #2a1f5c',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          height: 52,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              color: '#8a8aa0',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            Balance
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#d4a017',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>⚡</span>
            <span>{wallet.balance ?? '0 TMZ'}</span>
          </div>
        </div>
        <IconFooterBtn title="Settings" onClick={() => alert('Settings coming soon!')}>
          ⚙️
        </IconFooterBtn>
        <IconFooterBtn title="New Chat" onClick={handleNewChat}>
          ✏️
        </IconFooterBtn>
      </div>
    </aside>
  )
}

function IconFooterBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: hov ? '#1a1040' : 'transparent',
        border: '1px solid transparent',
        color: '#8a8aa0',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function ContactRow({
  contact,
  active,
  hovered,
  onHover,
  onClick,
}: {
  contact: Contact
  active: boolean
  hovered: boolean
  onHover: (id: string | null) => void
  onClick: () => void
}) {
  const bg = active
    ? 'rgba(124,58,237,0.18)'
    : hovered
    ? 'rgba(255,255,255,0.03)'
    : 'transparent'

  const preview = (contact.lastMessage ?? 'No messages yet').slice(0, 40)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        cursor: 'pointer',
        background: bg,
        borderLeft: `3px solid ${active ? '#7c3aed' : 'transparent'}`,
        transition: 'background 0.15s',
        minHeight: 56,
      }}
      onClick={onClick}
      onMouseEnter={() => onHover(contact.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: contact.avatarColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            color: '#fff',
          }}
        >
          {contact.initials}
        </div>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: contact.isOnline ? '#00c878' : '#3a3a5a',
            border: '2px solid #0f0a2a',
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        />
      </div>

      {/* Meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 13.5,
              color: '#fdf6e3',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 130,
            }}
          >
            {contact.name}
          </span>
          <span style={{ fontSize: 10, color: '#8a8aa0', flexShrink: 0, marginLeft: 4 }}>
            {formatTime(contact.lastMessageTime)}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#8a8aa0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {preview}
        </div>
      </div>

      {/* Unread badge */}
      {contact.unreadCount > 0 && (
        <div
          style={{
            background: '#7c3aed',
            color: '#fff',
            borderRadius: 10,
            padding: '2px 7px',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
            minWidth: 20,
            textAlign: 'center',
          }}
        >
          {contact.unreadCount}
        </div>
      )}
    </div>
  )
}
