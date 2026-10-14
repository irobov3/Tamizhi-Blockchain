import { useEffect, useRef, useCallback } from 'react';
import { useStore, Message } from '../store/useStore';
import { fetchMessages, deleteMessage, StoredMessage } from '../api/storage';
import { decryptMessage } from '../crypto/session';
import { CONFIG } from '../config';
import { notify } from '../utils/haptics';
import { addBreadcrumb } from '../utils/telemetry';

/**
 * Polls for new messages every POLL_INTERVAL_MS seconds.
 * Decrypts each message and adds it to the store.
 * Deletes messages from the server after successful decryption.
 */
export function useMessagePoller() {
  const { identity, addMessage, activeConversationId } = useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedIds = useRef<Set<string>>(new Set());

  const processMessage = useCallback(
    async (stored: StoredMessage): Promise<void> => {
      if (!identity) return;
      if (processedIds.current.has(stored.id)) return;

      const decrypted = decryptMessage(
        stored.encryptedContent,
        stored.nonce,
        stored.senderPubKey,
        identity.privateKey,
      );

      if (decrypted === null) {
        console.warn('Failed to decrypt message:', stored.id);
        return;
      }

      processedIds.current.add(stored.id);

      // Determine conversation ID
      const convId =
        stored.type === 'group' && stored.groupID
          ? stored.groupID
          : stored.senderPubKey;

      const msg: Message = {
        id: stored.id,
        _id: stored.id,
        senderId: stored.senderPubKey,
        recipientId: identity.publicKey,
        text: decrypted,
        timestamp: stored.timestamp,
        read: activeConversationId === convId,
        type: 'received',
        status: 'delivered',
        createdAt: new Date(stored.timestamp),
        user: {
          _id: stored.senderPubKey,
          name: stored.senderPubKey.slice(0, 8) + '...',
        },
      };

      addMessage(convId, msg);

      // Haptic + breadcrumb only if user isn't actively in this conversation
      if (activeConversationId !== convId) {
        notify();
        addBreadcrumb({
          category: 'message',
          message: `received from ${stored.senderPubKey.slice(0, 8)}`,
          level: 'info',
        });
      }

      // Delete from server after successful processing
      try {
        await deleteMessage(stored.id);
      } catch {
        // Non-critical — message will be fetched again next poll
      }
    },
    [identity, addMessage, activeConversationId],
  );

  const poll = useCallback(async () => {
    if (!identity) return;

    try {
      const messages = await fetchMessages(identity.publicKey);
      await Promise.allSettled(messages.map(processMessage));
    } catch {
      // Network errors are non-fatal during polling
    }
  }, [identity, processMessage]);

  useEffect(() => {
    if (!identity) return;

    // Immediate first poll
    poll();

    intervalRef.current = setInterval(poll, CONFIG.POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [identity, poll]);
}

/**
 * Returns messages for a specific conversation, sorted by timestamp.
 */
export function useConversationMessages(convId: string): Message[] {
  const conversation = useStore((s) =>
    s.conversations.find((c) => c.id === convId),
  );
  return (conversation?.messages ?? []).sort(
    (a, b) => a.timestamp - b.timestamp,
  );
}
