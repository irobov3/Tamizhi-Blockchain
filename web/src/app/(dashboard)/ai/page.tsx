'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  Globe,
  RefreshCw,
  User,
  Bot,
  ChevronDown,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

type Language = 'english' | 'tamil';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  language: Language;
}

const examplePrompts = {
  english: [
    "What is Thirukkural and why is it significant?",
    "Explain the Sangam period of Tamil literature",
    "Who were the Nayanmars and Alvars?",
    "Translate 'Akara Mudala Ezhutellam' and explain its meaning",
    "Tell me about Silappatikaram's story",
  ],
  tamil: [
    "திருக்குறள் பற்றி விளக்கவும்",
    "சங்க இலக்கியம் என்றால் என்ன?",
    "கம்பராமாயணம் பற்றி சொல்லுங்கள்",
    "தமிழ் இலக்கியத்தின் சிறப்புகள் யாவை?",
    "நாயன்மார்கள் வரலாறு என்ன?",
  ],
};

const assistantResponses: Record<string, string> = {
  "What is Thirukkural and why is it significant?":
    "Thirukkural (திருக்குறள்) is a classic Tamil language text consisting of 1,330 couplets (kurals) of seven words each. Written by the poet-saint Thiruvalluvar, it is considered one of the greatest works on ethics, political and economic matters, and love ever composed.\n\nKey significance:\n• It is organized into three books: Aram (Virtue), Porul (Wealth), and Inbam (Love)\n• Translated into over 80 languages worldwide\n• UNESCO listed it as part of world heritage literature\n• It preaches universal values applicable across cultures and eras\n• The opening couplet — 'அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு' — means 'As the letter A is the first of all letters, so the eternal God is first in the world'",
};

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "வணக்கம்! Hello! I'm Tamizhi AI, your guide to Tamil literature and culture. I can help you explore ancient texts, get translations, learn about Tamil history, and discover the richness of Tamil literary tradition.\n\nHow can I assist you today? / இன்று நான் உங்களுக்கு எவ்வாறு உதவலாம்?",
      timestamp: new Date(),
      language: 'english',
    },
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('english');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const simulateStreaming = async (fullContent: string): Promise<void> => {
    const words = fullContent.split(' ');
    let accumulated = '';
    for (let i = 0; i < words.length; i++) {
      accumulated += (i === 0 ? '' : ' ') + words[i];
      setStreamingContent(accumulated);
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 30));
    }
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      language,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    await new Promise((r) => setTimeout(r, 600));

    const responseContent =
      assistantResponses[text] ||
      (language === 'tamil'
        ? `"${text}" என்ற கேள்விக்கு நன்றி. தமிழ் இலக்கியம் உலகின் தொன்மையான மொழிகளில் ஒன்றான தமிழில் படைக்கப்பட்டது. இந்த விஷயத்தில் மேலும் அறிய, திருக்குறள், சங்க இலக்கியம், பக்தி இலக்கியம் ஆகியவற்றை ஆய்வு செய்யலாம். நான் உங்களுக்கு மேலும் தகவல்கள் வழங்க தயாராக உள்ளேன்.`
        : `Thank you for your question about "${text}". Tamil literature spans over 2,000 years and represents one of the world's longest-running literary traditions. The corpus includes ancient Sangam poetry (300 BCE – 300 CE), ethical treatises like Thirukkural, epics like Silappatikaram and Manimekalai, and devotional compositions by the Nayanmars and Alvars.\n\nIs there a specific aspect of Tamil literature you'd like to explore further?`);

    await simulateStreaming(responseContent);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      language,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(false);
    setStreamingContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'வணக்கம்! Hello! How can I help you explore Tamil literature today?',
        timestamp: new Date(),
        language,
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-background-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI Assistant</h1>
            <p className="tamil-text text-primary-400 text-xs">செயற்கை நுண்ணறிவு</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-DEFAULT rounded-xl border border-background-border">
            <button
              onClick={() => setLanguage('english')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                language === 'english'
                  ? 'bg-primary-500 text-white'
                  : 'text-text-secondary hover:text-white'
              )}
            >
              <Globe className="w-3 h-3" />
              EN
            </button>
            <button
              onClick={() => setLanguage('tamil')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all tamil-text',
                language === 'tamil'
                  ? 'bg-primary-500 text-white'
                  : 'text-text-secondary hover:text-white'
              )}
            >
              த
            </button>
          </div>
          <button
            onClick={clearChat}
            className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-surface-hover transition-colors"
            title="Clear chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              {/* Avatar */}
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  msg.role === 'user'
                    ? 'bg-primary-500/20 border border-primary-500/30'
                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-primary-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div className={clsx('max-w-[75%]', msg.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
                <div
                  className={clsx(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white rounded-tr-sm'
                      : 'bg-surface-DEFAULT border border-background-border text-text-primary rounded-tl-sm'
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-text-muted text-xs px-1">
                  {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-600">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="max-w-[75%]">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-DEFAULT border border-background-border text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 bg-primary-400 ml-1 animate-pulse rounded-sm align-middle" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading indicator (before streaming starts) */}
          {isStreaming && !streamingContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-600">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-DEFAULT border border-background-border">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Example Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 sm:px-6 pb-3">
          <p className="text-text-muted text-xs mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts[language].slice(0, 3).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className={clsx(
                  'px-3 py-1.5 rounded-full border border-background-border text-xs text-text-secondary hover:text-white hover:border-primary-500/40 transition-colors truncate max-w-[200px]',
                  language === 'tamil' && 'tamil-text'
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-4 pt-2 border-t border-background-border bg-[#0D0D1A]">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              language === 'tamil'
                ? 'தமிழ் இலக்கியத்தைப் பற்றி கேளுங்கள்...'
                : 'Ask about Tamil literature, history, or culture...'
            }
            rows={1}
            style={{ resize: 'none' }}
            className={clsx(
              'flex-1 bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[48px] max-h-32 overflow-y-auto',
              language === 'tamil' && 'tamil-text'
            )}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            {isStreaming ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-text-muted text-xs mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
