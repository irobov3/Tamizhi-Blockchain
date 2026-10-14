import React, { useState } from 'react'
import { useStore } from '../store'

export function ContactInfo() {
  const { contacts, activeContactId, toggleContactInfo } = useStore()
  const [copied, setCopied] = useState(false)
  const [showTmzModal, setShowTmzModal] = useState(false)

  const contact = contacts.find((c) => c.id === activeContactId)

  if (!contact) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(contact.address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // Mock shared media grid — 9 placeholder tiles
  const mediaTiles = Array.from({ length: 9 }, (_, i) => i)

  return (
    <aside
      style={{
        width: 300,
        flexShrink: 0,
        background: '#0f0a2a',
        borderLeft: '1px solid #2a1f5c',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Sticky header with close */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#0f0a2a',
          borderBottom: '1px solid #2a1f5c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          zIndex: 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#fdf6e3',
            letterSpacing: 0.3,
          }}
        >
          Contact Info
        </span>
        <button
          onClick={toggleContactInfo}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid #2a1f5c',
            color: '#8a8aa0',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            lineHeight: 1,
            transition: 'background 0.15s',
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {/* Avatar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: contact.avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
              marginBottom: 12,
              boxShadow: `0 0 0 4px rgba(124,58,237,0.15), 0 4px 20px rgba(0,0,0,0.4)`,
            }}
          >
            {contact.initials}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#fdf6e3',
              marginBottom: 6,
              textAlign: 'center',
            }}
          >
            {contact.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: contact.isOnline ? '#00c878' : '#8a8aa0',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: contact.isOnline ? '#00c878' : '#555',
                display: 'inline-block',
              }}
            />
            {contact.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Address */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              color: '#8a8aa0',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            Tamizhi Address
          </div>
          <div
            style={{
              background: '#1a1040',
              border: '1px solid #2a1f5c',
              borderRadius: 8,
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: '#8a8aa0',
                fontFamily: 'monospace',
                flex: 1,
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}
            >
              {contact.address}
            </span>
            <button
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy address'}
              style={{
                background: copied ? 'rgba(0,200,120,0.15)' : 'transparent',
                border: 'none',
                color: copied ? '#00c878' : '#8a8aa0',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 4px',
                borderRadius: 4,
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#2a1f5c', marginBottom: 16 }} />

        {/* Action buttons */}
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ActionButton
            label="💰 Send TMZ"
            bg="#d4a017"
            color="#0e0824"
            onClick={() => setShowTmzModal(true)}
          />
          <ActionButton
            label="🔗 View on Explorer"
            bg="#1a1040"
            color="#00d4ff"
            border="#2a1f5c"
            onClick={() =>
              alert(`Explorer: https://explorer.tamizhi.ai/address/${contact.address}`)
            }
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#2a1f5c', marginBottom: 16 }} />

        {/* Shared media */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: '#8a8aa0',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            Media
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
            }}
          >
            {mediaTiles.map((i) => (
              <div
                key={i}
                style={{
                  height: 76,
                  background: '#1a1040',
                  borderRadius: 8,
                  border: '1px solid #2a1f5c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3a2a6a',
                  fontSize: 20,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                🖼
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#2a1f5c', marginBottom: 16 }} />

        {/* Danger zone */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#8a8aa0',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            Actions
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <DangerBtn label="🔕 Mute" onClick={() => alert('Muted!')} />
            <DangerBtn label="🚫 Block" danger onClick={() => alert('Block coming soon')} />
          </div>
        </div>
      </div>

      {/* Inline TMZ modal (if opened from here) */}
      {showTmzModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTmzModal(false) }}
        >
          <div
            style={{
              background: '#1a1040',
              border: '1px solid #2a1f5c',
              borderRadius: 16,
              padding: 28,
              width: 320,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fdf6e3', marginBottom: 8 }}>
              Send TMZ to {contact.name}
            </div>
            <div style={{ fontSize: 12, color: '#8a8aa0', marginBottom: 16 }}>
              Use the chat to send TMZ directly.
            </div>
            <button
              onClick={() => setShowTmzModal(false)}
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 10,
                background: '#2a1f5c',
                border: 'none',
                color: '#fdf6e3',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

function ActionButton({
  label,
  bg,
  color,
  border,
  onClick,
}: {
  label: string
  bg: string
  color: string
  border?: string
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        background: hov ? bg + 'cc' : bg,
        border: border ? `1px solid ${border}` : 'none',
        color,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'opacity 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function DangerBtn({
  label,
  danger,
  onClick,
}: {
  label: string
  danger?: boolean
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1,
        padding: '9px 0',
        borderRadius: 10,
        background: hov ? (danger ? 'rgba(255,77,77,0.15)' : 'rgba(255,255,255,0.05)') : '#1a1040',
        border: `1px solid ${danger ? 'rgba(255,77,77,0.3)' : '#2a1f5c'}`,
        color: danger ? '#ff4d4d' : '#8a8aa0',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
