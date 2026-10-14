import { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '@/store/chat.store';
import { useWalletStore } from '@/store/wallet.store';
import {
  connect,
  disconnect,
  onMessage,
  onTyping,
  onUserStatus,
  onMessageDelivered,
  emitTyping as socketEmitTyping,
  sendMessage as socketSendMessage,
  joinRoom,
  markMessageRead,
  isConnected as socketIsConnected,
  IncomingMessage,
} from '@/lib/socket';
import {
  decryptMessage,
  deriveKeyPairFromMnemonic,
  importKey,
  exportKey,
} from '@/lib/crypto';
import { ChatMessage } from '@/store/chat.store';

export function useChat() {
  const {
    conversations,
    activeConversation,
    messages,
    isSocketConnected,
    typingIndicators,
    onlineUsers,
    setActiveConversation,
    addMessage,
    updateMessageStatus,
    markConversationRead,
    setSocketConnected,
    setTyping,
    setUserOnline,
    getMessagesForConversation,
    getUnreadCount,
    addConversation,
  } = useChatStore();

  const { walletAddress, mnemonic } = useWalletStore();
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Connect socket when wallet is connected
  useEffect(() => {
    if (!walletAddress || !mnemonic) return;

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('tamizhi_jwt') || ''
      : '';

    const socket = connect(token);

    socket.on('connect', () => {
      setSocketConnected(true);
      joinRoom(walletAddress);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Handle incoming messages
    const offMessage = onMessage(async (incomingMessage: IncomingMessage) => {
      let decryptedContent: string | undefined;

      try {
        if (mnemonic && incomingMessage.senderPublicKey && incomingMessage.nonce) {
          const keyPair = await deriveKeyPairFromMnemonic(mnemonic);
          const senderPubKey = importKey(incomingMessage.senderPublicKey);
          decryptedContent = decryptMessage(
            {
              ciphertext: incomingMessage.encryptedContent,
              nonce: incomingMessage.nonce,
              senderPublicKey: incomingMessage.senderPublicKey,
            },
            senderPubKey,
            keyPair.secretKey
          );
        }
      } catch (err) {
        console.warn('Failed to decrypt message:', err);
        decryptedContent = undefined;
      }

      const message: ChatMessage = {
        id: incomingMessage.id,
        conversationId: incomingMessage.conversationId,
        from: incomingMessage.from,
        to: incomingMessage.to,
        encryptedContent: incomingMessage.encryptedContent,
        decryptedContent,
        timestamp: incomingMessage.timestamp,
        isRead: false,
        status: 'delivered',
        nonce: incomingMessage.nonce,
      };

      addMessage(message);

      // Mark as read if this conversation is active
      if (activeConversation === incomingMessage.conversationId) {
        markMessageRead(incomingMessage.id, incomingMessage.conversationId);
      }
    });

    // Handle typing indicators
    const offTyping = onTyping(({ from, isTyping }) => {
      setTyping(from, isTyping);
    });

    // Handle user online status
    const offUserStatus = onUserStatus(({ address, online }) => {
      setUserOnline(address, online);
    });

    // Handle delivery receipts
    const offDelivered = onMessageDelivered(({ messageId }) => {
      updateMessageStatus(messageId, 'delivered');
    });

    return () => {
      offMessage();
      offTyping();
      offUserStatus();
      offDelivered();
      setSocketConnected(false);
      disconnect();
    };
  }, [walletAddress, mnemonic]);

  const sendMessage = useCallback(
    async ({
      to,
      content,
      conversationId,
      recipientPublicKey,
    }: {
      to: string;
      content: string;
      conversationId: string;
      recipientPublicKey?: string;
    }) => {
      if (!walletAddress) throw new Error('Wallet not connected');
      if (!socketIsConnected()) throw new Error('Not connected to chat server');

      let encryptedContent = content;
      let nonce = '';
      let senderPublicKey = '';

      if (mnemonic && recipientPublicKey) {
        const keyPair = await deriveKeyPairFromMnemonic(mnemonic);
        const recipientPubKey = importKey(recipientPublicKey);
        const encrypted = await import('@/lib/crypto').then((m) =>
          m.encryptMessage(content, recipientPubKey, keyPair.secretKey)
        );
        encryptedContent = encrypted.ciphertext;
        nonce = encrypted.nonce;
        senderPublicKey = encrypted.senderPublicKey;
      }

      const tempId = `temp-${Date.now()}`;

      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversationId,
        from: walletAddress,
        to,
        encryptedContent,
        decryptedContent: content,
        timestamp: new Date().toISOString(),
        isRead: false,
        status: 'sending',
        nonce,
      };

      addMessage(optimisticMessage);

      socketSendMessage({
        to,
        encryptedContent,
        nonce,
        senderPublicKey,
        conversationId,
        tempId,
      });

      return tempId;
    },
    [walletAddress, mnemonic, addMessage]
  );

  const emitTyping = useCallback(
    (to: string) => {
      socketEmitTyping(to, true);

      // Clear existing timeout
      if (typingTimeoutRef.current[to]) {
        clearTimeout(typingTimeoutRef.current[to]);
      }

      // Stop typing after 2s
      typingTimeoutRef.current[to] = setTimeout(() => {
        socketEmitTyping(to, false);
      }, 2000);
    },
    []
  );

  const openConversation = useCallback(
    (participantAddress: string) => {
      const existingConv = conversations.find(
        (c) => c.participantAddress === participantAddress
      );

      if (existingConv) {
        setActiveConversation(existingConv.id);
        return existingConv.id;
      }

      const newId = `conv-${participantAddress}-${walletAddress}`;
      addConversation({
        id: newId,
        participantAddress,
        unreadCount: 0,
        lastActivityAt: new Date().toISOString(),
      });
      setActiveConversation(newId);
      return newId;
    },
    [conversations, walletAddress, setActiveConversation, addConversation]
  );

  const isParticipantOnline = useCallback(
    (address: string) => onlineUsers.has(address),
    [onlineUsers]
  );

  return {
    // State
    conversations,
    activeConversation,
    messages: activeConversation ? getMessagesForConversation(activeConversation) : [],
    isConnected: isSocketConnected,
    typingIndicators,
    unreadCount: getUnreadCount(),

    // Actions
    sendMessage,
    emitTyping,
    setActiveConversation,
    openConversation,
    markConversationRead,
    isParticipantOnline,
  };
}
