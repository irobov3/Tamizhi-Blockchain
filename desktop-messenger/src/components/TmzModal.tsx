import { useState, useRef, useEffect } from 'react'

interface Props {
  contactName: string
  onConfirm: (amount: string, memo: string) => void
  onClose: () => void
}

export function TmzModal({ contactName, onConfirm, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const valid = amount.trim() !== '' && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0

  const handleConfirm = () => {
    if (!valid) return
    onConfirm(amount.trim(), memo.trim())
  }

  return (
    // Backdrop
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Modal card */}
      <div
        style={{
          background: '#1a1040',
          border: '1px solid #2a1f5c',
          borderRadius: 16,
          padding: '28px 32px',
          width: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#d4a017,#f59e0b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            💰
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fdf6e3' }}>
              Send TMZ
            </div>
            <div style={{ fontSize: 12, color: '#8a8aa0' }}>to {contactName}</div>
          </div>
          <button
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#8a8aa0',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Amount */}
        <label style={{ display: 'block', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: '#8a8aa0',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            Amount (TMZ)
          </div>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && valid) handleConfirm()
              }}
              placeholder="0.00"
              style={{
                width: '100%',
                background: '#0f0a2a',
                border: '1px solid #2a1f5c',
                borderRadius: 10,
                padding: '10px 60px 10px 14px',
                fontSize: 20,
                fontWeight: 700,
                color: '#d4a017',
                outline: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 12,
                fontWeight: 700,
                color: '#8a8aa0',
              }}
            >
              TMZ
            </span>
          </div>
        </label>

        {/* Memo */}
        <label style={{ display: 'block', marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              color: '#8a8aa0',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            Memo (optional)
          </div>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="What's this for?"
            maxLength={100}
            style={{
              width: '100%',
              background: '#0f0a2a',
              border: '1px solid #2a1f5c',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 13,
              color: '#fdf6e3',
              outline: 'none',
            }}
          />
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid #2a1f5c',
              color: '#8a8aa0',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!valid}
            style={{
              flex: 2,
              padding: '10px 0',
              borderRadius: 10,
              background: valid
                ? 'linear-gradient(135deg,#d4a017,#f59e0b)'
                : '#2a1f5c',
              border: 'none',
              color: valid ? '#0e0824' : '#8a8aa0',
              fontSize: 13,
              fontWeight: 700,
              cursor: valid ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            Send {amount && valid ? `${amount} TMZ` : 'TMZ'}
          </button>
        </div>
      </div>
    </div>
  )
}
