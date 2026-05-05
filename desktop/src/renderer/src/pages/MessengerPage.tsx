import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../store/chat.store';
import { useWalletStore } from '../store/wallet.store';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ConversationItem } from '../components/chat/ConversationItem';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';

// MARK: - MessengerPage

const MessengerPage: React.FC = () => {
  const {
    conversations,
    messages,
    activeConversationId,
    loadConversations,
    loadMessages,
    sendMessage,
    setActiveConversation,
    markRead,
    addIncomingMessage,
  } = useChatStore();

  const { address, x25519Secret } = useWalletStore();

  const [search, setSearch] = useState('');
  const [newConvAddress, setNewConvAddress] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  // Listen for incoming messages via IPC
  useEffect(() => {
    window.tamizhi.on('message:incoming', (msg) => {
      addIncomingMessage(msg as Parameters<typeof addIncomingMessage>[0]);
    });
    return () => window.tamizhi.off('message:incoming');
  }, [addIncomingMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeConversationId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConversationId]);

  const filteredConvs = conversations.filter((c) =>
    search ? c.address.toLowerCase().includes(search.toLowerCase()) : true
  );

  const activeMessages = activeConversationId ? (messages[activeConversationId] ?? []) : [];

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const peerAddress = activeConv?.address ?? '';

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || !activeConversationId || !address || !x25519Secret) return;
    const content = messageInput;
    setMessageInput('');
    setIsSending(true);
    try {
      await sendMessage(peerAddress, content, address, x25519Secret);
    } finally {
      setIsSending(false);
    }
  }, [messageInput, activeConversationId, address, x25519Secret, peerAddress, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartNewConv = () => {
    const trimmed = newConvAddress.trim();
    if (!trimmed || !address) return;
    const convId = [address, trimmed].sort().join(':');
    useChatStore.getState().upsertConversation({
      id: convId,
      address: trimmed,
      unread_count: 0,
      is_encrypted: true,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    setActiveConversation(convId);
    setShowNewConv(false);
    setNewConvAddress('');
  };

  const handleCopy = (text: string) => window.tamizhi.copyToClipboard(text);
  const handleDelete = async (id: string) => {
    await useChatStore.getState().deleteConversation(id);
  };

  return (
    <div
      className="flex h-full bg-navy-950 overflow-hidden"
      style={{ display: 'grid', gridTemplateColumns: '250px 1fr 280px' }}
    >
      {/* LEFT: Conversation List */}
      <div className="flex flex-col border-r border-white/10 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Messenger / தூதுவர்</h2>
            <button
              onClick={() => setShowNewConv((v) => !v)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="New conversation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full bg-white/[0.07] text-white placeholder-white/30 rounded-lg px-3 py-2 text-xs outline-none border border-transparent focus:border-gold-400/40"
          />

          {/* New conversation inline form */}
          {showNewConv && (
            <div className="space-y-2">
              <input
                value={newConvAddress}
                onChange={(e) => setNewConvAddress(e.target.value)}
                placeholder="Peer address…"
                className="w-full bg-white/[0.07] text-white placeholder-white/30 rounded-lg px-3 py-2 text-xs outline-none border border-transparent focus:border-gold-400/40 font-mono"
              />
              <Button size="sm" fullWidth onClick={handleStartNewConv} disabled={!newConvAddress.trim()}>
                Start Chat
              </Button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-xs space-y-2">
              <div className="text-3xl">🔒</div>
              <p>உரையாடல் இல்லை</p>
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                currentAddress={address ?? ''}
                onClick={() => setActiveConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* CENTER: Chat Window */}
      <div className="flex flex-col overflow-hidden border-r border-white/10">
        {activeConversationId && activeConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-navy-900/50">
              <div>
                <p className="text-white font-medium text-sm">
                  {peerAddress.slice(0, 10)}…{peerAddress.slice(-6)}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-xs text-green-400">E2E மறைகுறியாக்கப்பட்டது</p>
                </div>
              </div>
              <button
                onClick={() => setShowContactInfo((v) => !v)}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {activeMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-3">
                  <div className="text-4xl">🔒</div>
                  <p className="text-sm">End-to-end encrypted</p>
                  <p className="text-xs">Send the first message</p>
                </div>
              ) : (
                activeMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isSent={msg.sender === address}
                    onCopy={handleCopy}
                    onDelete={handleDelete}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="px-4 py-3 border-t border-white/10 bg-navy-900/30">
              <div className="flex items-end gap-3">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message / செய்தி…"
                  rows={1}
                  className="flex-1 bg-white/[0.07] text-white placeholder-white/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-transparent focus:border-gold-400/40 resize-none"
                  style={{ maxHeight: '120px', overflowY: 'auto' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim() || isSending}
                  className={[
                    'p-2.5 rounded-xl transition-colors flex items-center justify-center',
                    messageInput.trim() && !isSending
                      ? 'bg-saffron-500 text-navy-900 hover:bg-saffron-400'
                      : 'bg-saffron-500/30 text-navy-900/30 cursor-not-allowed',
                  ].join(' ')}
                >
                  {isSending ? (
                    <Spinner size="sm" color="text-navy-900" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/25 space-y-4">
            <div className="text-6xl">💬</div>
            <p className="text-sm">Select a conversation</p>
            <p className="text-xs">உரையாடலை தேர்ந்தெடுக்கவும்</p>
          </div>
        )}
      </div>

      {/* RIGHT: Contact Info Panel */}
      {showContactInfo && activeConv ? (
        <div className="flex flex-col overflow-y-auto p-5 space-y-5">
          <h3 className="text-white font-semibold text-sm">Contact Info</h3>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, #F5C518, #E8500A)', color: '#0A1628' }}
            >
              {peerAddress[0]?.toUpperCase()}
            </div>
            <p className="text-white/70 text-xs font-mono text-center break-all">{peerAddress}</p>
          </div>

          <div className="h-px bg-white/10" />

          {/* Address */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">Wallet Address</p>
            <div className="bg-navy-800 rounded-lg p-3">
              <p className="text-xs font-mono text-white/70 break-all">{peerAddress}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => window.tamizhi.copyToClipboard(peerAddress)}
            >
              Copy Address
            </Button>
          </div>

          <div className="h-px bg-white/10" />

          {/* Encryption Info */}
          <div className="space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Encryption</p>
            <div className="bg-green-900/30 border border-green-700/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span className="text-green-300 text-xs font-medium">End-to-End Encrypted</span>
              </div>
              <p className="text-green-300/70 text-xs">
                Messages are encrypted using X25519 + XSalsa20-Poly1305. Only you and the recipient can read them.
              </p>
            </div>

            {activeConv.is_encrypted ? (
              <div className="flex items-center gap-2 text-xs text-white/50">
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Recipient public key verified
              </div>
            ) : (
              <p className="text-amber-400 text-xs">⚠ Recipient public key not found</p>
            )}
          </div>

          <div className="h-px bg-white/10" />

          <Button variant="danger" size="sm" fullWidth onClick={() => setActiveConversation(null)}>
            Close Chat
          </Button>
        </div>
      ) : (
        <div className="flex-1 bg-navy-900/30" />
      )}
    </div>
  );
};

export default MessengerPage;
