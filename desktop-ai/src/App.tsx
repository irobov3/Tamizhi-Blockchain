import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import SourcesPanel from './components/SourcesPanel';
import CommandPalette from './components/CommandPalette';
import Settings from './components/Settings';
import { useConversations } from './store/conversations';
import { useSettings } from './store/settings';

export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const loadConversations = useConversations((s) => s.load);
  const loadSettings = useSettings((s) => s.load);

  useEffect(() => {
    loadConversations();
    loadSettings();
  }, [loadConversations, loadSettings]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app-root">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      <main className="chat-main">
        <ChatView onToggleSources={() => setSourcesOpen((o) => !o)} />
      </main>
      {sourcesOpen && <SourcesPanel onClose={() => setSourcesOpen(false)} />}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
