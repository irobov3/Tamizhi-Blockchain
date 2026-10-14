'use client';

import { useState } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/store/chat.store';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  onSelect?: () => void;
}

function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

function truncateMessage(content: string, maxLen = 40): string {
  if (!content) return '';
  const clean = content.replace(/\[Encrypted message\]/g, '🔒 Encrypted');
  return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const { conversations, activeConversation, setActiveConversation } = useChatStore();

  const filtered = conversations.filter(
    (conv) =>
      !search || conv.participantAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-background-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2 bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl text-sm focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <MessageSquare className="w-8 h-8 text-text-muted mb-2 opacity-50" />
            <p className="text-text-muted text-sm">
              {search ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = activeConversation === conv.id;
            const lastMsg = conv.lastMessage;
            const timeAgo = lastMsg
              ? formatDistanceToNow(new Date(lastMsg.timestamp), { addSuffix: false })
              : '';

            return (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConversation(conv.id);
                  onSelect?.();
                }}
                className={clsx(
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-background-border/50',
                  isActive
                    ? 'bg-primary-500/10 border-l-2 border-l-primary-500'
                    : 'hover:bg-surface-hover'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/70 to-accent/70 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {conv.participantAddress.charAt(8)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  {conv.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-background-card" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={clsx(
                        'text-sm font-mono truncate',
                        isActive ? 'text-primary-400 font-semibold' : 'text-text-primary font-medium'
                      )}
                    >
                      {truncateAddress(conv.participantAddress)}
                    </span>
                    <span className="text-text-muted text-xs flex-shrink-0 ml-2">{timeAgo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-muted text-xs truncate">
                      {lastMsg
                        ? truncateMessage(lastMsg.decryptedContent || lastMsg.encryptedContent)
                        : 'No messages yet'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary-500 text-white text-xs font-bold px-1">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
