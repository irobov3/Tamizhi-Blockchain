'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  autoFocus?: boolean
  large?: boolean
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search works, authors…',
  debounceMs = 300,
  autoFocus = false,
  large = false,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setLocalValue(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(next), debounceMs)
  }

  function handleClear() {
    setLocalValue('')
    onChange('')
  }

  const height = large ? '58px' : '48px'
  const fontSize = large ? '18px' : '15px'

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Search icon */}
      <span
        style={{
          position: 'absolute',
          left: large ? '18px' : '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#8a8aa0',
          pointerEvents: 'none',
          lineHeight: 1,
          zIndex: 1,
        }}
        aria-hidden="true"
      >
        <svg width={large ? '22' : '18'} height={large ? '22' : '18'} viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>

      <input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: '100%',
          height,
          boxSizing: 'border-box',
          padding: `0 ${large ? '52px' : '44px'}`,
          fontSize,
          border: '1px solid #2a1f5c',
          borderRadius: '12px',
          background: '#1a1040',
          color: '#fdf6e3',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          fontFamily: 'inherit',
        }}
        onFocus={(e) => {
          const el = e.currentTarget as HTMLInputElement
          el.style.borderColor = '#d4a017'
          el.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.15)'
        }}
        onBlur={(e) => {
          const el = e.currentTarget as HTMLInputElement
          el.style.borderColor = '#2a1f5c'
          el.style.boxShadow = 'none'
        }}
        aria-label="Search literary works"
      />

      {/* Clear button */}
      {localValue && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(138,138,160,0.15)',
            border: 'none',
            cursor: 'pointer',
            color: '#8a8aa0',
            padding: '4px',
            lineHeight: 1,
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(212,160,23,0.2)'
            el.style.color = '#d4a017'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(138,138,160,0.15)'
            el.style.color = '#8a8aa0'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
