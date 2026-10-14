import React, { useState, useRef, useEffect } from 'react';
import { useBrowser } from '../store/useBrowser';
import { askAI, buildPrompt, errorMessage } from '../ai/assistant';
import { t } from '../i18n';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const QUICK_ACTIONS = [
  { key: 'summarize' as const, icon: '📋', label: '' },
  { key: 'translate' as const, icon: '🔤', label: '' },
  { key: 'factcheck' as const, icon: '🔍', label: '' },
  { key: 'explain'   as const, icon: '💡', label: '' },
];

function MarkdownText({ text }: { text: string }) {
  // Basic markdown: **bold**, `code`, bullet points
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 3, fontSize: 12, fontFamily: 'monospace' }}>{p.slice(1, -1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--ai)',
          animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>{t('aiThinking')}</span>
    </div>
  );
}

export default function AISidebar() {
  const { tabs, activeTabId, showAISidebar, toggleAISidebar, aiTyping, setAITyping, settings } = useBrowser();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showAISidebar) setTimeout(() => inputRef.current?.focus(), 150);
  }, [showAISidebar]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  if (!showAISidebar) return null;

  async function send(userText?: string) {
    const text = (userText ?? input).trim();
    if (!text || aiTyping) return;

    setInput('');
    const userMsg: ChatMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAITyping(true);

    try {
      // Get page text for context
      let pageText = '';
      if (activeTab && !activeTab.isNewTab) {
        try { pageText = await window.ulaa.getPageText(); } catch {}
      }

      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const reply = await askAI(text, history, pageText);

      setMessages((prev) => [...prev, {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: reply.text,
        timestamp: Date.now(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `e_${Date.now()}`,
        role: 'assistant',
        content: errorMessage(err),
        timestamp: Date.now(),
      }]);
    } finally {
      setAITyping(false);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div style={{
      width: 320, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'var(--ai-dim)',
          border: '1px solid rgba(155,93,229,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai)' }}>{t('aiTitle')}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>
            {activeTab && !activeTab.isNewTab ? activeTab.title?.slice(0, 30) + '…' : t('aiSubtitle')}
          </div>
        </div>
        <button
          onClick={clearChat}
          title="Clear chat"
          style={{ color: 'var(--text3)', fontSize: 18, padding: '2px 6px' }}
        >
          ↺
        </button>
        <button
          onClick={toggleAISidebar}
          title="Close"
          style={{ color: 'var(--text3)', fontSize: 18, padding: '2px 6px' }}
        >
          ×
        </button>
      </div>

      {/* Quick actions */}
      {!activeTab?.isNewTab && (
        <div style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6,
          flexShrink: 0,
        }}>
          {QUICK_ACTIONS.map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => send(buildPrompt(key))}
              disabled={aiTyping}
              title={t(`ai${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '8px 4px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, cursor: aiTyping ? 'not-allowed' : 'pointer',
                transition: 'all 0.1s', opacity: aiTyping ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!aiTyping) (e.currentTarget as HTMLElement).style.borderColor = 'var(--ai)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.2 }}>
                {t(`ai${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No API key warning */}
      {!settings.aiApiKey && (
        <div style={{
          margin: 10, padding: '10px 12px',
          background: 'rgba(255,107,43,0.1)', border: '1px solid rgba(255,107,43,0.3)',
          borderRadius: 8, fontSize: 12, color: 'var(--primary)',
        }}>
          ⚠️ AI API key not configured. Go to Settings → AI Settings to add your key.
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{t('aiTitle')}</div>
            <div style={{ fontSize: 11 }}>{t('aiSubtitle')}</div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%',
              padding: '9px 12px',
              borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
              background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface2)',
              color: msg.role === 'user' ? '#fff' : 'var(--text)',
              fontSize: 13, lineHeight: 1.55,
              wordBreak: 'break-word',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
            }}>
              {msg.role === 'assistant'
                ? msg.content.split('\n').map((line, i) => <div key={i}><MarkdownText text={line} /></div>)
                : msg.content}
            </div>
            <span style={{ fontSize: 9, color: 'var(--text3)' }}>
              {new Date(msg.timestamp).toLocaleTimeString('ta-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {aiTyping && <ThinkingDots />}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 10px 12px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-end', gap: 8,
        flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder={t('aiPlaceholder')}
          rows={1}
          disabled={aiTyping}
          style={{
            flex: 1, padding: '8px 12px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, color: 'var(--text)', fontSize: 13,
            resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
            maxHeight: 100, overflowY: 'auto',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--ai)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || aiTyping}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: input.trim() && !aiTyping ? 'var(--ai)' : 'var(--surface2)',
            color: input.trim() && !aiTyping ? '#fff' : 'var(--text3)',
            cursor: input.trim() && !aiTyping ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, transition: 'all 0.15s',
            boxShadow: input.trim() ? '0 0 12px rgba(155,93,229,0.4)' : 'none',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
