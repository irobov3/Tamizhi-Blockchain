import React, {
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { useStore, makeConvId, MY_ADDRESS } from '../store'
import { MessageBubble } from './MessageBubble'
import { TmzModal } from './TmzModal'
import { Message } from '../types'

function dayLabel(ts: number): string {
  if (isToday(ts)) return 'Today'
  if (isYesterday(ts)) return 'Yesterday'
  return format(ts, 'MMMM d, yyyy')
}

function groupByDay(messages: Message[]): { label: string; items: Message[] }[] {
  const groups: { label: string; items: Message[] }[] = []
  let current: string | null = null
  for (const m of messages) {
    const label = dayLabel(m.timestamp)
    if (label !== current) {
      groups.push({ label, items: [m] })
      current = label
    } else {
      groups[groups.length - 1].items.push(m)
    }
  }
  return groups
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function IconBtn({
  children,
  title,
  onClick,
  highlight,
}: {
  children: React.ReactNode
  title: string
  onClick?: () => void
  highlight?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        background: highlight
          ? 'rgba(124,58,237,0.2)'
          : hov
          ? 'rgba(255,255,255,0.06)'
          : 'transparent',
        border: `1px solid ${highlight ? '#7c3aed' : '#2a1f5c'}`,
        color: highlight ? '#7c3aed' : '#8a8aa0',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export function ChatView() {
  const {
    contacts,
    activeContactId,
    messages,
    addMessage,
    updateMessageStatus,
    toggleContactInfo,
    showContactInfo,
  } = useStore()
  const [text, setText] = useState('')
  const [showTmzModal, setShowTmzModal] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const contact = contacts.find((c) => c.id === activeContactId)
  const convId = contact ? makeConvId(MY_ADDRESS, contact.address) : null
  const msgList = convId ? messages[convId] ?? [] : []

  // Auto-scroll to bottom on new messages or contact change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgList.length, activeContactId])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [text])

  // Empty state
  if (!contact || !convId) {
    return (
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          background: '#0e0824',
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #7c3aed, #d4a017)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          } as React.CSSProperties}
        >
          தமிழி
        </div>
        <div style={{ fontSize: 15, color: '#8a8aa0', fontWeight: 600 }}>
          Select a conversation
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#3a2a6a',
            background: '#1a1040',
            border: '1px solid #2a1f5c',
            borderRadius: 8,
            padding: '6px 16px',
          }}
        >
          End-to-end encrypted · On-chain messaging
        </div>
      </main>
    )
  }

  const handleSend = () => {
    if (!text.trim()) return
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const msg: Message = {
      id,
      conversationId: convId,
      from: MY_ADDRESS,
      to: contact.address,
      content: text.trim(),
      timestamp: Date.now(),
      status: 'sending',
      type: 'text',
    }
    addMessage(msg)
    setText('')

    setTimeout(() => updateMessageStatus(convId, id, 'sent'), 400)
    setTimeout(() => updateMessageStatus(convId, id, 'delivered'), 1200)
  }

  const handleTmzSend = (amount: string, _memo: string) => {
    setShowTmzModal(false)
    const id = `tmz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const msg: Message = {
      id,
      conversationId: convId,
      from: MY_ADDRESS,
      to: contact.address,
      content: amount,
      timestamp: Date.now(),
      status: 'sending',
      type: 'tmz_transfer',
      txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
      amount,
    }
    addMessage(msg)
    setTimeout(() => updateMessageStatus(convId, id, 'delivered'), 1200)
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const groups = groupByDay(msgList)
  const canSend = text.trim().length > 0
  const avatarBg = contact.avatarColor || '#7c3aed'

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        background: '#0e0824',
        position: 'relative',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          borderBottom: '1px solid #2a1f5c',
          background: '#0f0a2a',
          flexShrink: 0,
          height: 56,
        }}
      >
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: avatarBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              color: '#fff',
            }}
          >
            {contact.initials || getInitials(contact.name)}
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: contact.isOnline ? '#00c878' : '#555',
              border: '2px solid #0f0a2a',
              position: 'absolute',
              bottom: 0,
              right: 0,
            }}
          />
        </div>

        {/* Name + status */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#fdf6e3' }}>
            {contact.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: contact.isOnline ? '#00c878' : '#8a8aa0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 1,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: contact.isOnline ? '#00c878' : '#555',
                display: 'inline-block',
              }}
            />
            {contact.isOnline ? 'Online' : 'Offline'}
            <span style={{ color: '#3a2a6a', margin: '0 2px' }}>·</span>
            <span style={{ color: '#8a8aa0' }}>end-to-end encrypted</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <IconBtn title="Voice call">📞</IconBtn>
          <IconBtn title="Video call">📹</IconBtn>
          <IconBtn
            title="Contact info"
            onClick={toggleContactInfo}
            highlight={showContactInfo}
          >
            ℹ
          </IconBtn>
        </div>
      </header>

      {/* Messages area */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {msgList.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#8a8aa0',
              fontSize: 13,
              marginTop: 48,
            }}
          >
            No messages yet — say <span style={{ color: '#7c3aed' }}>வணக்கம்</span>!
          </div>
        )}

        {groups.map((g) => (
          <div key={g.label}>
            {/* Day divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                margin: '12px 0',
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#2a1f5c' }} />
              <span
                style={{
                  fontSize: 11,
                  color: '#8a8aa0',
                  letterSpacing: 0.5,
                  padding: '3px 10px',
                  background: '#1a1040',
                  borderRadius: 10,
                  border: '1px solid #2a1f5c',
                }}
              >
                {g.label}
              </span>
              <div style={{ flex: 1, height: 1, background: '#2a1f5c' }} />
            </div>

            {g.items.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                mine={m.from === MY_ADDRESS}
              />
            ))}
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        style={{
          borderTop: '1px solid #2a1f5c',
          padding: '10px 14px',
          background: '#0f0a2a',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          {/* Attach */}
          <ComposerBtn
            title="Attach file"
            onClick={() => {
              const inp = document.createElement('input')
              inp.type = 'file'
              inp.multiple = true
              inp.click()
            }}
          >
            📎
          </ComposerBtn>

          {/* TMZ */}
          <ComposerBtn
            title="Send TMZ"
            gold
            onClick={() => setShowTmzModal(true)}
          >
            🪙
          </ComposerBtn>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            style={{
              flex: 1,
              background: '#1a1040',
              border: '1px solid #2a1f5c',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13.5,
              color: '#fdf6e3',
              outline: 'none',
              resize: 'none',
              minHeight: 36,
              maxHeight: 120,
              lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Message ${contact.name}…  (Enter to send, Shift+Enter for new line)`}
            rows={1}
          />

          {/* Send */}
          <SendButton enabled={canSend} onClick={handleSend} />
        </div>
      </div>

      {/* TMZ Modal */}
      {showTmzModal && (
        <TmzModal
          contactName={contact.name}
          onConfirm={handleTmzSend}
          onClose={() => setShowTmzModal(false)}
        />
      )}
    </main>
  )
}

function ComposerBtn({
  children,
  title,
  onClick,
  gold,
}: {
  children: React.ReactNode
  title: string
  onClick?: () => void
  gold?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: hov ? '#1a1040' : 'transparent',
        border: `1px solid ${hov ? '#3a2a6a' : '#2a1f5c'}`,
        color: gold ? '#d4a017' : '#8a8aa0',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function SendButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Send"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: enabled
          ? hov
            ? 'linear-gradient(135deg, #5b21b6, #7c3aed)'
            : 'linear-gradient(135deg, #7c3aed, #a855f7)'
          : '#1a1040',
        border: 'none',
        color: enabled ? '#fff' : '#8a8aa0',
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: enabled ? 'pointer' : 'not-allowed',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      ➤
    </button>
  )
}
