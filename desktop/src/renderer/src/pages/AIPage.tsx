import React, { useState, useEffect, useRef, useCallback } from 'react';
import { streamAIResponse, getAIConversations } from '../lib/api';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import type { AIMessage, AIConversation } from '../../../shared/types';

// MARK: - Types

type Language = 'en' | 'ta';

interface Config {
  model: string;
  temperature: number;
  systemPrompt: string;
  useLiteratureContext: boolean;
}

const DEFAULT_CONFIG: Config = {
  model: 'claude-3-5-sonnet',
  temperature: 0.7,
  systemPrompt:
    'You are Tamizhi AI, an expert assistant specialising in Tamil literature, language, culture, and history. Respond thoughtfully and accurately.',
  useLiteratureContext: false,
};

const EXAMPLE_PROMPTS = [
  'திருக்குறள் என்ன சொல்கிறது?',
  'What is Sangam literature?',
  'Translate this Tamil text: அன்பிற்கும் உண்டோ அடைக்கும் தாழ்?',
  'Tamil grammar help: verb conjugation',
  'Who was Thiruvalluvar?',
  'சங்க இலக்கியம் பற்றி விளக்குங்கள்',
];

// MARK: - AIPage

const AIPage: React.FC = () => {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getAIConversations().then((convs) => {
      setConversations(
        convs.map((c) => ({
          id: c.id,
          title: c.title,
          messages: [],
          createdAt: c.updatedAt,
          updatedAt: c.updatedAt,
        }))
      );
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = useCallback(() => {
    const id = `conv-${Date.now()}`;
    const newConv: AIConversation = {
      id,
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(id);
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      if (!activeConvId) startNewConversation();

      const userMsg: AIMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const assistantPlaceholder: AIMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setInput('');
      setIsStreaming(true);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      let accumulated = '';

      const cancel = streamAIResponse({
        message: trimmed,
        history,
        systemPrompt: config.systemPrompt,
        language,
        model: config.model,
        temperature: config.temperature,
        onChunk: (chunk) => {
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantPlaceholder.id
                ? { ...m, content: accumulated }
                : m
            )
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantPlaceholder.id
                ? { ...m, isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
          cancelStreamRef.current = null;
        },
        onError: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantPlaceholder.id
                ? { ...m, content: 'Error: Failed to get response.', isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
          cancelStreamRef.current = null;
        },
      });

      cancelStreamRef.current = cancel;
    },
    [isStreaming, activeConvId, messages, config, language, startNewConversation]
  );

  const stopStreaming = () => {
    cancelStreamRef.current?.();
    cancelStreamRef.current = null;
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
    setIsStreaming(false);
  };

  return (
    <div className="flex h-full bg-navy-950 overflow-hidden">
      {/* LEFT: Conversation History */}
      <div className="w-56 shrink-0 border-r border-white/10 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-white/10">
          <Button variant="primary" size="sm" fullWidth onClick={startNewConversation}>
            + New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-center text-white/30 text-xs py-6">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={[
                  'w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors',
                  conv.id === activeConvId
                    ? 'bg-navy-700 text-white'
                    : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80',
                ].join(' ')}
              >
                <p className="truncate font-medium">{conv.title}</p>
                <p className="text-white/30 mt-0.5">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CENTER: Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E8500A, #F5C518)' }}
            >
              <span className="text-navy-900 font-bold text-sm">த</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Tamizhi AI</p>
              <p className="text-white/40 text-xs">Tamil Literature & Language</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLanguage((l) => (l === 'en' ? 'ta' : 'en'))}
              className="px-3 py-1.5 rounded-lg bg-navy-800 border border-white/10 text-sm font-semibold text-white hover:border-gold-400/40 transition-colors"
            >
              {language === 'en' ? 'EN → த' : 'த → EN'}
            </button>

            {/* Config toggle */}
            <button
              onClick={() => setShowConfig((v) => !v)}
              className={[
                'p-2 rounded-lg transition-colors',
                showConfig ? 'bg-saffron-500/20 text-saffron-400' : 'text-white/40 hover:bg-white/10 hover:text-white',
              ].join(' ')}
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="space-y-8 max-w-2xl mx-auto">
              {/* Hero */}
              <div className="text-center pt-8 space-y-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #E8500A, #F5C518)' }}
                >
                  <span className="text-3xl font-bold text-navy-900">த</span>
                </div>
                <h2 className="text-xl font-semibold text-white">How can I help?</h2>
                <p className="text-white/40 text-sm">
                  {language === 'ta'
                    ? 'தமிழ் இலக்கியம், வரலாறு, மொழி பற்றி கேளுங்கள்'
                    : 'Ask about Tamil literature, history, grammar, or culture'}
                </p>
              </div>

              {/* Example prompts */}
              <div className="grid grid-cols-2 gap-3">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left bg-navy-800 border border-white/10 hover:border-saffron-500/40 hover:bg-navy-700 rounded-xl px-4 py-3 text-sm text-white/70 hover:text-white transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
                <AIMessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-white/10">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={
                language === 'ta'
                  ? 'தமிழ் இலக்கியம் பற்றி கேளுங்கள்…'
                  : 'Ask about Tamil literature, language, culture…'
              }
              rows={1}
              className="flex-1 bg-white/[0.07] text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-gold-400/40 resize-none"
              style={{ maxHeight: '150px', overflowY: 'auto' }}
            />

            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="p-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className={[
                  'p-3 rounded-xl transition-colors',
                  input.trim()
                    ? 'bg-saffron-500 hover:bg-saffron-400 text-navy-900'
                    : 'bg-saffron-500/25 text-navy-900/30 cursor-not-allowed',
                ].join(' ')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Config Panel */}
      {showConfig && (
        <div className="w-72 shrink-0 border-l border-white/10 p-5 overflow-y-auto space-y-5">
          <h3 className="text-white font-semibold text-sm">Configuration</h3>

          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Model</label>
            <select
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
              className="w-full bg-white/[0.07] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-transparent focus:border-gold-400/40"
            >
              <option value="claude-3-5-sonnet">Claude Sonnet 4.5</option>
              <option value="claude-3-haiku">Claude Haiku</option>
              <option value="claude-3-opus">Claude Opus</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="tamizhi-local">Tamizhi Local</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/40 uppercase tracking-wider">Temperature</label>
              <span className="text-xs text-saffron-400 font-mono">{config.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={config.temperature}
              onChange={(e) => setConfig((c) => ({ ...c, temperature: parseFloat(e.target.value) }))}
              className="w-full accent-saffron-500"
            />
            <div className="flex justify-between text-[10px] text-white/25">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">System Prompt</label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
              rows={5}
              className="w-full bg-white/[0.07] text-white text-xs rounded-lg px-3 py-2.5 outline-none border border-transparent focus:border-gold-400/40 resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.useLiteratureContext}
              onChange={(e) => setConfig((c) => ({ ...c, useLiteratureContext: e.target.checked }))}
              className="w-4 h-4 accent-saffron-500"
            />
            <span className="text-sm text-white/70">Use literature context</span>
          </label>

          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => setConfig(DEFAULT_CONFIG)}
          >
            Reset to defaults
          </Button>
        </div>
      )}
    </div>
  );
};

// MARK: - AI Message Bubble

const AIMessageBubble: React.FC<{ message: AIMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {isUser ? (
        <div className="w-7 h-7 rounded-full bg-navy-600 border border-white/20 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      ) : (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #E8500A, #F5C518)' }}
        >
          <span className="text-navy-900 font-bold text-xs">த</span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={[
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-navy-700 text-white rounded-tr-sm'
            : 'bg-navy-800 border border-white/10 text-white/90 rounded-tl-sm',
        ].join(' ')}
      >
        {message.content || (message.isStreaming ? (
          <TypingDots />
        ) : null)}

        {message.isStreaming && message.content && (
          <span className="inline-block w-0.5 h-4 bg-saffron-400 ml-0.5 align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
};

// MARK: - Typing Dots

const TypingDots: React.FC = () => (
  <div className="flex items-center gap-1.5 py-1">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

export default AIPage;
