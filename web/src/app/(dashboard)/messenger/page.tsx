'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Wifi, WifiOff } from 'lucide-react';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useWalletStore } from '@/store/wallet.store';
import { useChatStore } from '@/store/chat.store';
import { useSocket } from '@/hooks/useSocket';
import { clsx } from 'clsx';

export default function MessengerPage() {
  const { isConnected, walletAddress } = useWalletStore();
  const { activeConversation, isSocketConnected, addConversation, setActiveConversation } = useChatStore();
  const [showNewChat, setShowNewChat] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Connect/disconnect socket based on wallet state
  useSocket();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connect to Messenger</h2>
        <p className="tamil-text text-primary-400 text-sm mb-4">மறைகுறியாக்க செய்தி</p>
        <p className="text-text-secondary text-center max-w-sm text-sm">
          Please connect your wallet to access end-to-end encrypted messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversation List - hidden on mobile when chat is open */}
      <div
        className={clsx(
          'flex-shrink-0 border-r border-background-border',
          'w-full sm:w-80 lg:w-88',
          activeConversation && mobileView === 'chat' ? 'hidden sm:flex sm:flex-col' : 'flex flex-col'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-background-border">
          <div>
            <h1 className="text-lg font-bold text-white">Messages</h1>
            <p className="tamil-text text-primary-400 text-xs">தூதர்</p>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* E2E + connection status */}
        <div className="mx-4 my-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/15">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-green-400 text-xs flex-1">End-to-end encrypted</span>
          {isSocketConnected ? (
            <Wifi className="w-3 h-3 text-green-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-text-muted" aria-label="Connecting..." />
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <ConversationList
            onSelect={() => setMobileView('chat')}
          />
        </div>
      </div>

      {/* Chat Window */}
      <div
        className={clsx(
          'flex-1 min-w-0',
          !activeConversation && mobileView !== 'chat' ? 'hidden sm:flex sm:flex-col' : 'flex flex-col',
          activeConversation && mobileView === 'chat' ? 'flex flex-col' : ''
        )}
      >
        {activeConversation ? (
          <ChatWindow
            onBack={() => {
              setMobileView('list');
            }}
          />
        ) : (
          <div className="hidden sm:flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-surface-DEFAULT border border-background-border flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-secondary mb-2">
              Select a conversation
            </h3>
            <p className="text-text-muted text-sm max-w-xs">
              Choose a conversation from the list or start a new encrypted chat.
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-background-card border border-background-border rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">New Conversation</h3>
            <p className="text-text-muted text-sm mb-4">
              Enter the TMZ wallet address of the person you want to message.
            </p>
            <input
              type="text"
              placeholder="tamizhi1..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewChat(false)}
                className="flex-1 py-2.5 rounded-xl border border-background-border text-text-secondary hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const addr = newAddress.trim();
                  if (addr.startsWith('tamizhi1') && addr.length > 20) {
                    // Derive a stable conversation ID from the two addresses (sorted)
                    const participants = [walletAddress ?? '', addr].sort();
                    const convId = `conv_${participants[0]}_${participants[1]}`;

                    addConversation({
                      id: convId,
                      participantAddress: addr,
                      unreadCount: 0,
                      lastActivityAt: new Date().toISOString(),
                    });
                    setActiveConversation(convId);
                    setShowNewChat(false);
                    setNewAddress('');
                    setMobileView('chat');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium transition-colors"
              >
                Start Chat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
