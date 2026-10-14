import React from 'react'
import { format } from 'date-fns'
import { Message } from '../types'

function statusGlyph(status: Message['status']): string {
  switch (status) {
    case 'sending':   return '○'
    case 'sent':      return '✓'
    case 'delivered': return '✓✓'
    case 'read':      return '✓✓'
    case 'failed':    return '!'
  }
}

function statusColor(status: Message['status']): string {
  switch (status) {
    case 'read':    return '#00d4ff'
    case 'failed':  return '#ff4455'
    default:        return 'rgba(253,246,227,0.5)'
  }
}

function truncHash(hash: string) {
  if (hash.length <= 20) return hash
  return hash.slice(0, 10) + '…' + hash.slice(-8)
}

interface Props {
  message: Message
  mine: boolean
}

export function MessageBubble({ message, mine }: Props) {
  const isTmz = message.type === 'tmz_transfer'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        marginBottom: 4,
      }}
    >
      {isTmz ? (
        <TmzTransferBubble message={message} mine={mine} />
      ) : (
        <TextBubble message={message} mine={mine} />
      )}
    </div>
  )
}

function TextBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div
      style={{
        maxWidth: '65%',
        padding: '9px 13px',
        borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: mine
          ? 'linear-gradient(135deg, #3d1c8c, #6b2fa0)'
          : '#1e1550',
        border: mine ? 'none' : '1px solid #2a1f5c',
        wordBreak: 'break-word',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      } as React.CSSProperties}
    >
      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.5,
          color: '#fdf6e3',
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.content}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 5,
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: 'rgba(253,246,227,0.5)' }}>
          {format(message.timestamp, 'HH:mm')}
        </span>
        {mine && (
          <span
            style={{
              fontSize: 11,
              color: statusColor(message.status),
              fontWeight: 600,
            }}
          >
            {statusGlyph(message.status)}
          </span>
        )}
      </div>
    </div>
  )
}

function TmzTransferBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div
      style={{
        maxWidth: '65%',
        padding: '14px 16px',
        borderRadius: 14,
        background: '#1a1040',
        border: '1px solid #d4a017',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,160,23,0.1)',
      }}
    >
      {/* Icon + amount */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d4a017, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          💰
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(253,246,227,0.55)',
              marginBottom: 3,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {mine ? 'You sent' : 'Received'}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#d4a017',
              letterSpacing: 0.5,
            }}
          >
            {message.amount ?? message.content} TMZ
          </div>
        </div>
      </div>

      {/* Transaction hash */}
      {message.txHash && (
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 6,
            padding: '5px 8px',
            fontSize: 10,
            color: 'rgba(253,246,227,0.45)',
            fontFamily: 'monospace',
            marginBottom: 8,
            wordBreak: 'break-all',
          }}
        >
          tx: {truncHash(message.txHash)}
        </div>
      )}

      {/* Timestamp + status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span style={{ fontSize: 10, color: 'rgba(253,246,227,0.4)' }}>
          {format(message.timestamp, 'HH:mm')}
        </span>
        {mine && (
          <span
            style={{
              fontSize: 11,
              color: statusColor(message.status),
              fontWeight: 600,
            }}
          >
            {statusGlyph(message.status)}
          </span>
        )}
      </div>
    </div>
  )
}
