import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import type { Message } from '../types'

interface Props {
  message: Message
}

// Blink animation injected once
const BLINK_STYLE_ID = 'tmz-blink-style'
function ensureBlinkStyle() {
  if (typeof document !== 'undefined' && !document.getElementById(BLINK_STYLE_ID)) {
    const style = document.createElement('style')
    style.id = BLINK_STYLE_ID
    style.textContent = `
      @keyframes tmzBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      .tmz-cursor { display: inline-block; animation: tmzBlink 1s steps(1) infinite; margin-left: 2px; }
    `
    document.head.appendChild(style)
  }
}
ensureBlinkStyle()

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          margin: '8px 0',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: '#7c3aed',
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          You
        </div>
        <div
          style={{
            background: '#2d1b69',
            borderRadius: '18px 18px 4px 18px',
            padding: '12px 16px',
            maxWidth: '70%',
            color: '#f0f0ff',
            fontSize: 15,
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
        <div style={{ fontSize: 10, color: '#6060a0', marginTop: 4 }}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        margin: '8px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>தமிழி AI</span>
        {message.model && (
          <span style={{ fontSize: 10, color: '#6060a0' }}>
            {message.model.includes('sonnet') ? 'sonnet' : 'haiku'}
          </span>
        )}
      </div>
      <div
        style={{
          background: '#111130',
          border: '1px solid #1e1e4a',
          borderRadius: '4px 18px 18px 18px',
          padding: '12px 16px',
          maxWidth: '75%',
          color: '#f0f0ff',
          fontSize: 15,
          lineHeight: 1.6,
          wordBreak: 'break-word',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            p: ({ children }) => (
              <p style={{ margin: '0.35em 0' }}>{children}</p>
            ),
            pre: ({ children }) => (
              <pre
                style={{
                  background: '#0a0a18',
                  padding: 12,
                  borderRadius: 6,
                  overflowX: 'auto',
                  fontSize: 12,
                  margin: '8px 0',
                }}
              >
                {children}
              </pre>
            ),
            code: ({ children, className }) => {
              const isBlock = !!className
              return isBlock ? (
                <code className={className} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {children}
                </code>
              ) : (
                <code
                  style={{
                    background: '#1e1e4a',
                    borderRadius: 3,
                    padding: '1px 5px',
                    fontFamily: 'monospace',
                    fontSize: 13,
                  }}
                >
                  {children}
                </code>
              )
            },
          }}
        >
          {message.content || ' '}
        </ReactMarkdown>
        {message.isStreaming && (
          <span className="tmz-cursor" aria-hidden="true">
            ▊
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: '#6060a0', marginTop: 4 }}>
        {formatTime(message.timestamp)}
      </div>
    </div>
  )
}
