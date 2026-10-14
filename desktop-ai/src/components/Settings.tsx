import { useState } from 'react'
import { useStore } from '../store'
import type { Model } from '../types'

const MODELS: { value: Model; label: string; desc: string }[] = [
  {
    value: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    desc: 'Best for complex tasks, nuanced Tamil, and blockchain analysis',
  },
  {
    value: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku',
    desc: 'Faster and lighter — great for quick translations and simple questions',
  },
]

export default function Settings() {
  const storeApiKey = useStore((s) => s.apiKey)
  const storeModel = useStore((s) => s.model)
  const setApiKey = useStore((s) => s.setApiKey)
  const setModel = useStore((s) => s.setModel)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const deleteAllConversations = useStore((s) => s.deleteConversation)
  const conversations = useStore((s) => s.conversations)

  const [draftKey, setDraftKey] = useState(storeApiKey)
  const [showKey, setShowKey] = useState(false)
  const [draftModel, setDraftModel] = useState<Model>(storeModel)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save() {
    setApiKey(draftKey.trim())
    setModel(draftModel)
    toggleSettings()
  }

  function clearAll() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    // delete all conversations one by one
    const ids = conversations.map((c) => c.id)
    ids.forEach((id) => deleteAllConversations(id))
    setConfirmDelete(false)
    toggleSettings()
  }

  return (
    <div
      onClick={toggleSettings}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: '90vw',
          background: '#0d0d25',
          border: '1px solid #1e1e4a',
          borderRadius: 16,
          padding: 32,
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={toggleSettings}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: '#6060a0',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            padding: '2px 6px',
          }}
        >
          ×
        </button>

        <h2 style={{ margin: '0 0 24px', color: '#f0f0ff', fontSize: 20 }}>Settings</h2>

        {/* API Key */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              color: '#6060a0',
              marginBottom: 6,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Anthropic API Key
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                flex: 1,
                background: '#111130',
                border: '1px solid #1e1e4a',
                borderRadius: 8,
                color: '#f0f0ff',
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
              }}
              onFocus={(e) =>
                ((e.target as HTMLInputElement).style.borderColor = '#7c3aed')
              }
              onBlur={(e) =>
                ((e.target as HTMLInputElement).style.borderColor = '#1e1e4a')
              }
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              style={{
                background: '#111130',
                border: '1px solid #1e1e4a',
                borderRadius: 8,
                color: '#6060a0',
                padding: '9px 12px',
                cursor: 'pointer',
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <div style={{ marginTop: 6 }}>
            <a
              href="https://console.anthropic.com/account/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#7c3aed', textDecoration: 'none' }}
            >
              Get API key from console.anthropic.com →
            </a>
          </div>
        </div>

        {/* Model selection */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              color: '#6060a0',
              marginBottom: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Model
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODELS.map((m) => (
              <label
                key={m.value}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  background: draftModel === m.value ? '#1a1050' : '#111130',
                  border: `1px solid ${draftModel === m.value ? '#7c3aed' : '#1e1e4a'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.value}
                  checked={draftModel === m.value}
                  onChange={() => setDraftModel(m.value)}
                  style={{ marginTop: 2, accentColor: '#7c3aed' }}
                />
                <div>
                  <div style={{ fontSize: 13, color: '#f0f0ff', fontWeight: 600 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#6060a0', marginTop: 2 }}>{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Language preference pills */}
        <div style={{ marginBottom: 32 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              color: '#6060a0',
              marginBottom: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Response Language
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['English', 'Tamil', 'Both'] as const).map((lang) => (
              <button
                key={lang}
                style={{
                  background: lang === 'English' ? '#7c3aed' : '#111130',
                  border: `1px solid ${lang === 'English' ? '#7c3aed' : '#1e1e4a'}`,
                  borderRadius: 20,
                  color: lang === 'English' ? '#fff' : '#6060a0',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {lang}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#6060a0', marginTop: 6 }}>
            Language preference is communicated via system prompt
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={clearAll}
            style={{
              background: confirmDelete ? '#7f1d1d' : 'transparent',
              border: `1px solid ${confirmDelete ? '#ef4444' : '#3b1a1a'}`,
              borderRadius: 8,
              color: '#ef4444',
              padding: '9px 16px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {confirmDelete ? 'Confirm — delete all' : 'Clear all conversations'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={toggleSettings}
              style={{
                background: 'transparent',
                border: '1px solid #1e1e4a',
                borderRadius: 8,
                color: '#6060a0',
                padding: '9px 18px',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              style={{
                background: '#7c3aed',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 600,
                padding: '9px 24px',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
