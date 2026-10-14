import { useEffect, useState } from 'react'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import ChatView from './components/ChatView'
import SourcesPanel from './components/SourcesPanel'
import Settings from './components/Settings'
import CommandPalette from './components/CommandPalette'

export default function App() {
  const showSettings = useStore((s) => s.showSettings)
  const showSources = useStore((s) => s.showSources)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        toggleSettings()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleSettings])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
        background: '#0a0a1a',
        overflow: 'hidden',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans Tamil', sans-serif",
        color: '#f0f0ff',
        fontSize: 14,
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <ChatView />
      </div>
      {showSources && <SourcesPanel />}
      {showSettings && <Settings />}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
