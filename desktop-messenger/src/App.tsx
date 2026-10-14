import { Sidebar } from './components/Sidebar'
import { ChatView } from './components/ChatView'
import { ContactInfo } from './components/ContactInfo'
import { TitleBar } from './components/TitleBar'
import { useStore } from './store'

export default function App() {
  const showContactInfo = useStore((s) => s.showContactInfo)
  const activeContactId = useStore((s) => s.activeContactId)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#0e0824',
        color: '#fdf6e3',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Noto Sans Tamil", Roboto, sans-serif',
      }}
    >
      <TitleBar />
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          minHeight: 0,
          height: 'calc(100vh - 36px)',
        }}
      >
        <Sidebar />
        <ChatView />
        {activeContactId && showContactInfo && <ContactInfo />}
      </div>
    </div>
  )
}
