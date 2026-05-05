import React from 'react';
import type { ConversationRow } from '../../../../shared/types';

// MARK: - Types

export interface ConversationItemProps {
  conversation: ConversationRow;
  isActive: boolean;
  onClick: () => void;
  currentAddress: string;
}

// MARK: - Helpers

function truncateAddress(address: string, chars = 8): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-6)}`;
}

function formatTimestamp(ms?: number): string {
  if (!ms) return '';
  const date = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function getAvatarLetter(address: string): string {
  return (address[0] ?? '?').toUpperCase();
}

// MARK: - Component

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  currentAddress,
}) => {
  const peerAddress = conversation.address === currentAddress
    ? conversation.id.split(':').find((a) => a !== currentAddress) ?? conversation.address
    : conversation.address;

  const avatarLetter = getAvatarLetter(peerAddress);
  const displayAddress = truncateAddress(peerAddress);
  const preview = conversation.last_message
    ? conversation.last_message.slice(0, 40) + (conversation.last_message.length > 40 ? '…' : '')
    : 'No messages yet';
  const timestamp = formatTimestamp(conversation.last_message_at);
  const unread = conversation.unread_count ?? 0;

  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg',
        'transition-colors duration-100 group',
        isActive
          ? 'bg-navy-700 border-l-2 border-saffron-500'
          : 'hover:bg-white/[0.05] border-l-2 border-transparent',
      ].join(' ')}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm select-none"
        style={{ background: 'linear-gradient(135deg, #F5C518, #E8500A)', color: '#0A1628' }}
        aria-hidden
      >
        {avatarLetter}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              'text-sm truncate',
              unread > 0 ? 'font-semibold text-white' : 'font-medium text-white/80',
            ].join(' ')}
          >
            {displayAddress}
          </span>
          {timestamp && (
            <span
              className={[
                'text-[10px] shrink-0',
                unread > 0 ? 'text-saffron-400' : 'text-white/35',
              ].join(' ')}
            >
              {timestamp}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-white/40 truncate flex-1">{preview}</span>

          {unread > 0 && (
            <span
              className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-navy-900"
              style={{ background: '#E8500A' }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ConversationItem;
