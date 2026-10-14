import axios from 'axios';
import { CONFIG } from '../config';
import { withRetry } from '../utils/network';

const api = axios.create({
  baseURL: CONFIG.STORAGE_SERVER_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export interface MessageEnvelope {
  recipientPubKey: string;
  encryptedContent: string;
  senderPubKey: string;
  nonce: string;
  type: 'direct' | 'group';
  groupID?: string;
  expiryDays?: number;
  timestamp?: number;
}

export interface StoredMessage {
  id: string;
  recipientPubKey: string;
  encryptedContent: string;
  senderPubKey: string;
  nonce: string;
  type: 'direct' | 'group';
  groupID?: string;
  timestamp: number;
  expiryTimestamp: number;
}

/**
 * Send an encrypted message envelope to the storage server.
 * Returns the message ID assigned by the server.
 */
export async function sendMessage(
  envelope: MessageEnvelope,
): Promise<string> {
  const payload = {
    ...envelope,
    timestamp: envelope.timestamp ?? Date.now(),
    expiryDays: envelope.expiryDays ?? CONFIG.MESSAGE_TTL_DAYS,
  };

  const response = await withRetry(
    () =>
      api.post<{ msgID: string; success: boolean }>('/v1/store', payload),
    {
      label: 'storage.sendMessage',
      maxAttempts: 3,
      shouldRetry: (err: any) => {
        // Don't retry 4xx (client errors) — only network/5xx
        const status = err?.response?.status;
        return !status || status >= 500;
      },
    },
  );
  return response.data.msgID;
}

/**
 * Fetch all pending messages for a session public key.
 */
export async function fetchMessages(
  sessionPubKey: string,
): Promise<StoredMessage[]> {
  const response = await withRetry(
    () =>
      api.get<{ messages: StoredMessage[] }>(`/v1/retrieve/${sessionPubKey}`),
    {
      label: 'storage.fetchMessages',
      maxAttempts: 2,
      baseDelayMs: 300,
    },
  );
  return response.data.messages ?? [];
}

/**
 * Delete a message from the storage server (after successful delivery).
 */
export async function deleteMessage(msgID: string): Promise<void> {
  await api.delete(`/v1/message/${msgID}`);
}

/**
 * Mock implementation for development/testing when server is unavailable.
 */
export function createMockStoredMessage(
  envelope: MessageEnvelope,
): StoredMessage {
  return {
    id: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    ...envelope,
    timestamp: Date.now(),
    expiryTimestamp: Date.now() + CONFIG.MESSAGE_TTL_DAYS * 86400000,
  };
}
