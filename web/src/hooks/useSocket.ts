'use client';

import { useEffect, useRef } from 'react';
import { useWalletStore } from '@/store/wallet.store';
import { useChatStore } from '@/store/chat.store';
import * as socket from '@/lib/socket';

/**
 * Manages the Socket.io lifecycle tied to wallet connection state.
 * - Connects when wallet is connected and a JWT is available.
 * - Registers all event handlers and keeps the chat store in sync.
 * - Disconnects and cleans up on wallet disconnect or unmount.
 */
export function useSocket() {
  const { isConnected: walletConnected, walletAddress } = useWalletStore();
  const {
    addMessage,
    setSocketConnected,
    setTyping,
    setUserOnline,
    updateMessageStatus,
    addConversation,
    conversations,
  } = useChatStore();

  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!walletConnected || !walletAddress) {
      socket.disconnect();
      setSocketConnected(false);
      return;
    }

    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('tamizhi_jwt') ?? walletAddress)
      : walletAddress;

    const sock = socket.connect(token);

    sock.on('connect', () => {
      setSocketConnected(true);
      socket.joinRoom(walletAddress);
    });

    sock.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Incoming message
    const offMessage = socket.onMessage((msg) => {
      const convId = msg.conversationId;

      // Auto-create conversation if we haven't seen it before
      const exists = useChatStore.getState().conversations.find((c) => c.id === convId);
      if (!exists) {
        addConversation({
          id: convId,
          participantAddress: msg.from,
          unreadCount: 1,
          lastActivityAt: msg.timestamp,
          recipientPublicKey: msg.senderPublicKey,
        });
      }

      addMessage({
        id: msg.id,
        conversationId: convId,
        from: msg.from,
        to: msg.to,
        encryptedContent: msg.encryptedContent,
        timestamp: msg.timestamp,
        isRead: false,
        status: 'delivered',
        nonce: msg.nonce,
      });
    });

    // Typing indicator
    const offTyping = socket.onTyping(({ from, isTyping }) => {
      setTyping(from, isTyping);
    });

    // Online status
    const offStatus = socket.onUserStatus(({ address, online }) => {
      setUserOnline(address, online);
    });

    // Delivery receipt
    const offDelivered = socket.onMessageDelivered(({ messageId }) => {
      updateMessageStatus(messageId, 'delivered');
    });

    cleanupRef.current = [offMessage, offTyping, offStatus, offDelivered];

    return () => {
      cleanupRef.current.forEach((off) => off());
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [walletConnected, walletAddress]); // eslint-disable-line react-hooks/exhaustive-deps
}
