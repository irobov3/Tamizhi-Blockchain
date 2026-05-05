'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search works, authors…',
  debounceMs = 300,
  autoFocus = false,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local in sync if parent resets value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setLocalValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  }

  function handleClear() {
    setLocalValue('');
    onChange('');
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
      {/* Search icon */}
      <span
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9b8469',
          pointerEvents: 'none',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
          boxSizing: 'border-box',
          padding: '12px 44px 12px 44px',
          fontSize: '16px',
          border: '2px solid #e8e0d0',
          borderRadius: '10px',
          background: '#fff',
          color: '#2d1b00',
          outline: 'none',
          transition: 'border-color 0.2s',
          fontFamily: 'inherit',
        }}
        onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = '#c0392b')}
        onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = '#e8e0d0')}
        aria-label="Search literary works"
      />

      {/* Clear button */}
      {localValue && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9b8469',
            padding: '4px',
            lineHeight: 1,
            borderRadius: '50%',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
