'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  ArrowLeft,
  Check,
  CheckCheck,
  Lock,
  MoreVertical,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { useChatStore, ChatMessage } from '@/store/chat.store';
import { useWalletStore } from '@/store/wallet.store';
import { encryptMessage, decryptMessage, deriveKeyPairFromMnemonic } from '@/lib/crypto';
import { sendMessage as socketSend, emitTyping } from '@/lib/socket';
import { clsx } from 'clsx';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

interface ChatWindowProps {
  onBack?: () => void;
}

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  return format(date, 'MMM d, HH:mm');
}

function MessageBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  const StatusIcon = message.status === 'read'
    ? CheckCheck
    : message.status === 'delivered' || message.status === 'sent'
    ? CheckCheck
    : message.status === 'sending'
    ? Check
    : message.status === 'failed'
    ? AlertCircle
    : Check;

  const content = message.decryptedContent || '[Encrypted message]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex', isMine ? 'justify-end' : 'justify-start')}
    >
      <div className={clsx('max-w-[75%] flex flex-col', isMine ? 'items-end' : 'items-start')}>
        <div
          className={clsx(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
            isMine
              ? 'bg-primary-500 text-white rounded-br-sm'
              : 'bg-surface-DEFAULT border border-background-border text-text-primary rounded-bl-sm'
          )}
        >
          {content}
        </div>
        <div className={clsx('flex items-center gap-1 mt-0.5 px-1', isMine ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-text-muted text-xs">{formatMessageTime(message.timestamp)}</span>
          {isMine && (
            <StatusIcon
              className={clsx(
                'w-3.5 h-3.5',
                message.status === 'read' ? 'text-blue-400' :
                message.status === 'failed' ? 'text-red-400' :
                'text-text-muted'
              )}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatWindow({ onBack }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { activeConversation, conversations, messages: allMessages, addMessage, typingIndicators } = useChatStore();
  const { walletAddress, mnemonic } = useWalletStore();

  const conversation = conversations.find((c) => c.id === activeConversation);
  const messages = activeConversation ? allMessages[activeConversation] || [] : [];
  const isTyping = conversation ? typingIndicators[conversation.participantAddress] : false;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleTyping = () => {
    if (!conversation) return;
    emitTyping(conversation.participantAddress, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(conversation.participantAddress, false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || !walletAddress || !conversation || sending) return;

    setSending(true);
    const text = input.trim();
    setInput('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversationId: activeConversation!,
      from: walletAddress,
      to: conversation.participantAddress,
      encryptedContent: text, // Will be replaced with encrypted content
      decryptedContent: text,
      timestamp: new Date().toISOString(),
      isRead: false,
      status: 'sending',
    };

    addMessage(optimisticMessage);

    try {
      let encryptedContent = text;
      let nonce = '';
      let senderPublicKey = '';

      if (mnemonic && conversation.recipientPublicKey) {
        const keyPair = await deriveKeyPairFromMnemonic(mnemonic);
        const { importKey } = await import('@/lib/crypto');
        const recipientPubKey = importKey(conversation.recipientPublicKey);
        const encrypted = encryptMessage(text, recipientPubKey, keyPair.secretKey);
        encryptedContent = encrypted.ciphertext;
        nonce = encrypted.nonce;
        senderPublicKey = encrypted.senderPublicKey;
      }

      socketSend({
        to: conversation.participantAddress,
        encryptedContent,
        nonce,
        senderPublicKey,
        conversationId: activeConversation!,
        tempId,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 10)}...${address.slice(-6)}`;
  };

  if (!activeConversation || !conversation) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-background-border bg-background-card flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="sm:hidden p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {conversation.participantAddress.charAt(8).toUpperCase()}
            </span>
          </div>
          {conversation.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-background-card" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white font-mono truncate">
            {truncateAddress(conversation.participantAddress)}
          </div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {isTyping ? (
              <span className="text-primary-400 animate-pulse">typing...</span>
            ) : (
              <span>{conversation.isOnline ? 'Online' : 'End-to-end encrypted'}</span>
            )}
          </div>
        </div>

        <button className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* E2E Notice */}
      <div className="flex items-center justify-center py-2 px-4">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Lock className="w-3 h-3" />
          Messages are end-to-end encrypted with NaCl
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-surface-DEFAULT border border-background-border flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-text-muted" />
            </div>
            <p className="text-text-secondary text-sm mb-1">No messages yet</p>
            <p className="text-text-muted text-xs">
              Send a message to start an encrypted conversation
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={message.from === walletAddress}
              />
            ))}

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-surface-DEFAULT border border-background-border">
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
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-background-border bg-background-card">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type an encrypted message..."
            rows={1}
            style={{ resize: 'none' }}
            className="flex-1 bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[46px] max-h-28 overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-text-muted text-xs text-center mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
