import React, { useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

type BtnName = 'minimize' | 'maximize' | 'close'

export function TitleBar() {
  const [hovered, setHovered] = useState<BtnName | null>(null)
  const win = getCurrentWindow

  const btnStyle = (name: BtnName): React.CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: 6,
    background:
      name === 'close' && hovered === 'close'
        ? '#dc2626'
        : hovered === name
        ? '#1a1040'
        : 'transparent',
    border: 'none',
    color: name === 'close' && hovered === 'close' ? '#fff' : '#8a8aa0',
    fontSize: name === 'close' ? 18 : 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
    lineHeight: 1,
    padding: 0,
  })

  return (
    <div
      style={{
        height: 36,
        background: '#0a0618',
        borderBottom: '1px solid #1a1040',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 14,
        paddingRight: 4,
        userSelect: 'none',
        flexShrink: 0,
        // @ts-ignore
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Logo + title */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #d4a017)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 900,
          color: '#fff',
          marginRight: 8,
          flexShrink: 0,
        }}
      >
        த
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#8a8aa0',
          letterSpacing: 0.3,
        }}
      >
        Tamizhi Messenger
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Window controls */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <button
          style={btnStyle('minimize')}
          title="Minimize"
          onMouseEnter={() => setHovered('minimize')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => win().minimize()}
        >
          ─
        </button>
        <button
          style={btnStyle('maximize')}
          title="Maximize"
          onMouseEnter={() => setHovered('maximize')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => win().toggleMaximize()}
        >
          □
        </button>
        <button
          style={btnStyle('close')}
          title="Close"
          onMouseEnter={() => setHovered('close')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => win().close()}
        >
          ×
        </button>
      </div>
    </div>
  )
}
