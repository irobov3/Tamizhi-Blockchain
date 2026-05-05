import React, { useState, useRef, useCallback } from 'react';
import type { StoredMessage } from '../../../../shared/types';

// MARK: - Types

export interface MessageBubbleProps {
  message: StoredMessage;
  isSent: boolean;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
}

// MARK: - Status Icon

const StatusIcon: React.FC<{ status: StoredMessage['status'] }> = ({ status }) => {
  switch (status) {
    case 'sending':
      return (
        <svg className="w-3 h-3 text-white/30 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      );
    case 'sent':
      return <CheckIcon className="text-white/40" />;
    case 'delivered':
      return <DoubleCheckIcon className="text-white/60" />;
    case 'read':
      return <DoubleCheckIcon className="text-blue-400" />;
    case 'failed':
      return (
        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    default:
      return null;
  }
};

const CheckIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-3 h-3 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DoubleCheckIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-4 h-3 ${className}`} fill="none" viewBox="0 0 28 24" stroke="currentColor" strokeWidth="2.5">
    <polyline points="22 6 11 17 6 12" />
    <polyline points="28 6 17 17 12 12" />
  </svg>
);

// MARK: - Context Menu

interface ContextMenuProps {
  x: number;
  y: number;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onCopy, onDelete, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}
      className="bg-navy-700 border border-white/15 rounded-lg shadow-xl overflow-hidden py-1 min-w-[140px]"
    >
      <button
        onClick={() => { onCopy(); onClose(); }}
        className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        Copy
      </button>
      <div className="h-px bg-white/10 mx-2" />
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        Delete
      </button>
    </div>
  );
};

// MARK: - Main Component

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
  onCopy,
  onDelete,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fade-in on mount
  React.useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const content = message.body ?? (message.ciphertext ? '🔒 Encrypted message' : '');

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Rounded corners: sent = (16,4,16,16), received = (4,16,16,16)
  const bubbleStyle: React.CSSProperties = isSent
    ? {
        borderRadius: '16px 4px 16px 16px',
        background: 'linear-gradient(135deg, #E8500A, #F5A623)',
        color: '#0A1628',
      }
    : {
        borderRadius: '4px 16px 16px 16px',
        background: 'rgba(13, 27, 58, 0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
      };

  return (
    <>
      <div
        className={[
          'flex items-end gap-2 transition-all duration-300',
          isSent ? 'flex-row-reverse' : 'flex-row',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        ].join(' ')}
        style={{ transition: 'opacity 0.2s ease, transform 0.2s ease' }}
        onContextMenu={handleContextMenu}
      >
        {/* Spacer on opposite side */}
        {!isSent && <div className="w-8 shrink-0" />}

        <div
          className={`flex flex-col gap-1 max-w-[70%] ${isSent ? 'items-end' : 'items-start'}`}
        >
          {/* Bubble */}
          <div
            style={bubbleStyle}
            className="px-3.5 py-2.5 text-sm leading-relaxed select-text cursor-text shadow-md"
          >
            {content}
          </div>

          {/* Meta row */}
          <div className={`flex items-center gap-1 px-1 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-[10px] text-white/35">{timestamp}</span>
            {isSent && <StatusIcon status={message.status} />}
          </div>
        </div>

        {isSent && <div className="w-8 shrink-0" />}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onCopy={() => onCopy(content)}
          onDelete={() => onDelete(message.id)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};

export default MessageBubble;
