import { useCallback } from 'react';
import type { StoredMessage, StoredWallet, ConversationRow } from '../../../shared/types';

/**
 * Typed wrappers over the window.tamizhi IPC bridge.
 * Use this hook anywhere in the renderer process instead of
 * accessing window.tamizhi directly.
 */
export function useIPC() {
  // MARK: - Crypto

  const generateWallet = useCallback(
    (mnemonic?: string): Promise<{
      mnemonic: string;
      address: string;
      publicKey: string;
      x25519Public: string;
      x25519Secret: string;
    }> => {
      return window.tamizhi.crypto.generateWallet(mnemonic);
    },
    []
  );

  const encryptMessage = useCallback(
    (
      plaintext: string,
      recipientX25519Public: string,
      senderX25519Secret: string
    ): Promise<{ ciphertext: string; nonce: string; ephemeralPubKey: string }> => {
      return window.tamizhi.crypto.encryptMessage({
        plaintext,
        recipientX25519Public,
        senderX25519Secret,
      });
    },
    []
  );

  const decryptMessage = useCallback(
    (
      ciphertext: string,
      nonce: string,
      ephemeralPubKey: string,
      recipientX25519Secret: string
    ): Promise<string> => {
      return window.tamizhi.crypto.decryptMessage({
        ciphertext,
        nonce,
        ephemeralPubKey,
        recipientX25519Secret,
      });
    },
    []
  );

  const deriveX25519 = useCallback(
    (mnemonic: string): Promise<{ x25519Public: string; x25519Secret: string }> => {
      return window.tamizhi.crypto.deriveX25519(mnemonic);
    },
    []
  );

  const sign = useCallback(
    (data: string, privateKey: string): Promise<string> => {
      return window.tamizhi.crypto.sign({ data, privateKey });
    },
    []
  );

  // MARK: - Database

  const getMessages = useCallback(
    (convId: string): Promise<StoredMessage[]> => {
      return window.tamizhi.db.getMessages(convId);
    },
    []
  );

  const saveMessage = useCallback(
    (msg: StoredMessage): Promise<{ success: boolean }> => {
      return window.tamizhi.db.saveMessage(msg);
    },
    []
  );

  const getConversations = useCallback((): Promise<ConversationRow[]> => {
    return window.tamizhi.db.getConversations();
  }, []);

  const getWallet = useCallback((): Promise<StoredWallet | null> => {
    return window.tamizhi.db.getWallet();
  }, []);

  const saveWallet = useCallback(
    (wallet: StoredWallet): Promise<{ success: boolean }> => {
      return window.tamizhi.db.saveWallet(wallet);
    },
    []
  );

  const updateMessageStatus = useCallback(
    (id: string, status: string): Promise<{ success: boolean }> => {
      return window.tamizhi.db.updateMessageStatus(id, status);
    },
    []
  );

  const markConversationRead = useCallback(
    (id: string): Promise<{ success: boolean }> => {
      return window.tamizhi.db.markConversationRead(id);
    },
    []
  );

  const upsertConversation = useCallback(
    (conv: ConversationRow): Promise<{ success: boolean }> => {
      return window.tamizhi.db.upsertConversation(conv);
    },
    []
  );

  // MARK: - Shell

  const openExternal = useCallback((url: string): Promise<{ success: boolean }> => {
    return window.tamizhi.openExternal(url);
  }, []);

  const copy = useCallback((text: string): Promise<{ success: boolean }> => {
    return window.tamizhi.copyToClipboard(text);
  }, []);

  const notify = useCallback(
    (title: string, body: string): Promise<{ success: boolean }> => {
      return window.tamizhi.showNotification(title, body);
    },
    []
  );

  const getVersion = useCallback((): Promise<string> => {
    return window.tamizhi.getVersion();
  }, []);

  // MARK: - Event Emitter

  const onEvent = useCallback(
    (channel: string, cb: (...args: unknown[]) => void) => {
      window.tamizhi.on(channel, cb);
    },
    []
  );

  const offEvent = useCallback((channel: string) => {
    window.tamizhi.off(channel);
  }, []);

  const onceEvent = useCallback(
    (channel: string, cb: (...args: unknown[]) => void) => {
      window.tamizhi.once(channel, cb);
    },
    []
  );

  return {
    // Crypto
    generateWallet,
    encryptMessage,
    decryptMessage,
    deriveX25519,
    sign,
    // DB
    getMessages,
    saveMessage,
    getConversations,
    getWallet,
    saveWallet,
    updateMessageStatus,
    markConversationRead,
    upsertConversation,
    // Shell
    openExternal,
    copy,
    notify,
    getVersion,
    // Events
    onEvent,
    offEvent,
    onceEvent,
  } as const;
}

export type IPC = ReturnType<typeof useIPC>;
