import { useEffect, useRef, useState } from 'react';
import { useConversations } from '../store/conversations';
import { useSettings } from '../store/settings';
import MessageBubble from './MessageBubble';
import StreamingMessage from './StreamingMessage';
import InputBar from './InputBar';
import { streamClaude } from '../ai/anthropic';

interface Props {
  onToggleSources: () => void;
}

export default function ChatView({ onToggleSources }: Props) {
  const { conversations, activeId, appendMessage, updateLastAssistant, newConversation } =
    useConversations();
  const settings = useSettings();
  const [streaming, setStreaming] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [active?.messages, streaming]);

  async function handleSend(text: string) {
    if (!text.trim()) return;
    let convId = activeId;
    if (!convId) {
      convId = newConversation(text.slice(0, 40));
    }

    appendMessage(convId, { role: 'user', content: text });

    if (!settings.apiKey) {
      appendMessage(convId, {
        role: 'assistant',
        content: 'Please set your Anthropic API key in Settings (Cmd+,)',
      });
      return;
    }

    setIsStreaming(true);
    setStreaming('');
    appendMessage(convId, { role: 'assistant', content: '' });

    try {
      const conv = useConversations.getState().conversations.find((c) => c.id === convId)!;
      const history = conv.messages.filter((m) => m.content.length > 0 || m.role === 'user');
      let acc = '';
      for await (const token of streamClaude(settings.apiKey, history, settings.model)) {
        acc += token;
        setStreaming(acc);
      }
      updateLastAssistant(convId, acc);
    } catch (err: any) {
      updateLastAssistant(convId, `Error: ${err?.message ?? String(err)}`);
    } finally {
      setIsStreaming(false);
      setStreaming('');
    }
  }

  return (
    <div className="chat-view">
      <header className="chat-header">
        <div className="chat-title">{active?.title || 'New conversation'}</div>
        <button className="sources-toggle" onClick={onToggleSources}>
          Sources
        </button>
      </header>

      <div className="messages" ref={scrollRef}>
        {!active && (
          <div className="empty-state">
            <h1>Tamizhi AI</h1>
            <p>Ask me anything in Tamil or English.</p>
          </div>
        )}
        {active?.messages.map((m, i) => {
          const isLast = i === active.messages.length - 1;
          if (isLast && m.role === 'assistant' && isStreaming) {
            return <StreamingMessage key={m.id} text={streaming} />;
          }
          return <MessageBubble key={m.id} message={m} />;
        })}
      </div>

      <InputBar onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
