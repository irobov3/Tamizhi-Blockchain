import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import type { Message } from '../types'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import { sendMessage } from '../services/ai'

const SUGGESTIONS = [
  'Ask about Thirukkural',
  'Explain TMZ staking',
  'Translate to Tamil',
  'Tamil history',
]

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function ChatView() {
  const conversations = useStore((s) => s.conversations)
  const activeConversationId = useStore((s) => s.activeConversationId)
  const createConversation = useStore((s) => s.createConversation)
  const addMessage = useStore((s) => s.addMessage)
  const updateLastMessage = useStore((s) => s.updateLastMessage)
  const finalizeLastMessage = useStore((s) => s.finalizeLastMessage)
  const isStreaming = useStore((s) => s.isStreaming)
  const setStreaming = useStore((s) => s.setStreaming)
  const apiKey = useStore((s) => s.apiKey)
  const model = useStore((s) => s.model)
  const toggleSources = useStore((s) => s.toggleSources)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const showSources = useStore((s) => s.showSources)

  const scrollRef = useRef<HTMLDivElement>(null)

  const activeConv = conversations.find((c) => c.id === activeConversationId) ?? null

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeConv?.messages.length, activeConv?.messages])

  async function handleSend(text: string) {
    if (!text.trim() || isStreaming) return

    // Ensure there's an active conversation
    let convId = activeConversationId
    if (!convId) {
      convId = createConversation(text)
    }

    // Add user message
    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    addMessage(convId, userMsg)

    if (!apiKey) {
      const errMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: 'Please set your Anthropic API key in **Settings** (click ⚙️ or press Cmd+,)',
        timestamp: Date.now(),
      }
      addMessage(convId, errMsg)
      return
    }

    // Add empty assistant placeholder
    const assistantMsg: Message = {
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      model,
    }
    addMessage(convId, assistantMsg)
    setStreaming(true)

    // Build message history for API (exclude the empty assistant placeholder)
    const currentConv =
      useStore.getState().conversations.find((c) => c.id === convId) ?? activeConv
    const history = (currentConv?.messages ?? [])
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }))

    let accumulated = ''

    await sendMessage(
      history,
      apiKey,
      model,
      (chunk: string) => {
        accumulated += chunk
        updateLastMessage(convId!, accumulated)
      },
      () => {
        finalizeLastMessage(convId!, accumulated)
      },
      (err: string) => {
        finalizeLastMessage(convId!, `Error: ${err}`)
      },
    )
  }

  async function handleSuggestion(suggestion: string) {
    const convId = createConversation(suggestion)
    // small delay to let the state settle
    await new Promise((r) => setTimeout(r, 50))
    // directly call handleSend equivalent
    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: suggestion,
      timestamp: Date.now(),
    }
    addMessage(convId, userMsg)

    if (!apiKey) {
      addMessage(convId, {
        id: uid(),
        role: 'assistant',
        content: 'Please set your Anthropic API key in **Settings** (click ⚙️ or press Cmd+,)',
        timestamp: Date.now(),
      })
      return
    }

    const assistantMsg: Message = {
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      model,
    }
    addMessage(convId, assistantMsg)
    setStreaming(true)

    let accumulated = ''
    await sendMessage(
      [{ role: 'user', content: suggestion }],
      apiKey,
      model,
      (chunk: string) => {
        accumulated += chunk
        updateLastMessage(convId, accumulated)
      },
      () => {
        finalizeLastMessage(convId, accumulated)
      },
      (err: string) => {
        finalizeLastMessage(convId, `Error: ${err}`)
      },
    )
  }

  const modelShort = model.includes('sonnet') ? 'claude-3-5-sonnet-20241022' : 'claude-3-haiku-20240307'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a1a',
        minWidth: 0,
        height: '100vh',
      }}
    >
      {/* Welcome screen when no active conversation */}
      {!activeConv ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
          }}
        >
          <div style={{ fontSize: 48, color: '#7c3aed', marginBottom: 8 }}>வணக்கம்!</div>
          <div style={{ fontSize: 24, color: '#f0f0ff', marginBottom: 8 }}>Tamizhi AI</div>
          <div style={{ fontSize: 14, color: '#6060a0', marginBottom: 40 }}>
            Ask about Tamil language, literature, or the Tamizhi blockchain
          </div>

          {/* Suggestion cards 2x2 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              maxWidth: 480,
              width: '100%',
            }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void handleSuggestion(s)}
                style={{
                  background: '#0d0d25',
                  border: '1px solid #1e1e4a',
                  borderRadius: 10,
                  color: '#f0f0ff',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = '#7c3aed'
                  el.style.background = '#111130'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = '#1e1e4a'
                  el.style.background = '#0d0d25'
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input bar at the bottom even when no conversation */}
          <div style={{ width: '100%', maxWidth: 680, marginTop: 40 }}>
            <InputBar onSend={handleSend} disabled={isStreaming} />
          </div>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <header
            style={{
              height: 48,
              background: '#0d0d25',
              borderBottom: '1px solid #1e1e4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16, color: '#f0f0ff', fontWeight: 600 }}>
              {activeConv.title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  background: '#1e1e4a',
                  color: '#7c3aed',
                  borderRadius: 5,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {modelShort.split('-').slice(0, 3).join('-')}
              </span>
              <button
                onClick={toggleSources}
                style={{
                  background: showSources ? '#1e1e4a' : 'transparent',
                  border: '1px solid #1e1e4a',
                  borderRadius: 6,
                  color: '#f0f0ff',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  fontSize: 13,
                }}
                title="Toggle sources panel"
              >
                📚
              </button>
              <button
                onClick={toggleSettings}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6060a0',
                  cursor: 'pointer',
                  fontSize: 18,
                  padding: '2px 4px',
                }}
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {activeConv.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>

          {/* Input bar */}
          <div
            style={{
              background: '#0d0d25',
              borderTop: '1px solid #1e1e4a',
              padding: 16,
              flexShrink: 0,
            }}
          >
            <InputBar onSend={handleSend} disabled={isStreaming} />
            <div
              style={{
                fontSize: 10,
                color: '#6060a0',
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              Model: {modelShort} · Tamizhi AI
            </div>
          </div>
        </>
      )}
    </div>
  )
}
