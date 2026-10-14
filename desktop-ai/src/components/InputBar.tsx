import { useEffect, useRef, useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea (1–5 lines)
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const lineHeight = 22
    const maxHeight = lineHeight * 5 + 20
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + 'px'
  }, [text])

  function send() {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      send()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const canSend = text.trim().length > 0 && !disabled

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="Ask Tamizhi AI… (Enter to send, Shift+Enter for new line)"
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          background: '#111130',
          border: '1px solid #1e1e4a',
          borderRadius: 12,
          color: '#f0f0ff',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: '22px',
          fontFamily: 'inherit',
          outline: 'none',
          minHeight: 44,
          maxHeight: 130,
          overflowY: 'auto',
          boxSizing: 'border-box',
          opacity: disabled ? 0.7 : 1,
        }}
        onFocus={(e) => {
          ;(e.target as HTMLTextAreaElement).style.borderColor = '#7c3aed'
        }}
        onBlur={(e) => {
          ;(e.target as HTMLTextAreaElement).style.borderColor = '#1e1e4a'
        }}
      />
      <button
        onClick={send}
        disabled={!canSend}
        style={{
          background: canSend ? '#7c3aed' : '#2a2a50',
          border: 'none',
          borderRadius: 8,
          color: canSend ? '#fff' : '#6060a0',
          fontWeight: 600,
          fontSize: 14,
          padding: '10px 18px',
          cursor: canSend ? 'pointer' : 'not-allowed',
          height: 44,
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          if (canSend) (e.currentTarget as HTMLButtonElement).style.background = '#6d28d9'
        }}
        onMouseLeave={(e) => {
          if (canSend) (e.currentTarget as HTMLButtonElement).style.background = '#7c3aed'
        }}
      >
        Send
      </button>
    </div>
  )
}
