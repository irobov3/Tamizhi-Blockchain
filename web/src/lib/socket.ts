import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

let socket: Socket | null = null;

export interface IncomingMessage {
  id: string;
  from: string;
  to: string;
  conversationId: string;
  encryptedContent: string;
  nonce: string;
  senderPublicKey: string;
  timestamp: string;
}

export interface SocketEvents {
  onMessage: (message: IncomingMessage) => void;
  onTyping: (data: { from: string; isTyping: boolean }) => void;
  onUserOnline: (data: { address: string; online: boolean }) => void;
  onDelivered: (data: { messageId: string }) => void;
  onRead: (data: { messageId: string; conversationId: string }) => void;
  onError: (error: { message: string }) => void;
}

export function connect(token: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}

export function onMessage(callback: (message: IncomingMessage) => void): () => void {
  if (!socket) return () => {};
  socket.on('message:receive', callback);
  return () => socket?.off('message:receive', callback);
}

export function onTyping(
  callback: (data: { from: string; isTyping: boolean }) => void
): () => void {
  if (!socket) return () => {};
  socket.on('typing', callback);
  return () => socket?.off('typing', callback);
}

export function onUserStatus(
  callback: (data: { address: string; online: boolean }) => void
): () => void {
  if (!socket) return () => {};
  socket.on('user:status', callback);
  return () => socket?.off('user:status', callback);
}

export function onMessageDelivered(
  callback: (data: { messageId: string }) => void
): () => void {
  if (!socket) return () => {};
  socket.on('message:delivered', callback);
  return () => socket?.off('message:delivered', callback);
}

export function sendMessage(payload: {
  to: string;
  encryptedContent: string;
  nonce: string;
  senderPublicKey: string;
  conversationId: string;
  tempId: string;
}): void {
  if (!socket) {
    throw new Error('Socket not connected');
  }
  socket.emit('message:send', payload);
}

export function emitTyping(to: string, isTyping: boolean): void {
  if (!socket) return;
  socket.emit('typing', { to, isTyping });
}

export function joinRoom(address: string): void {
  if (!socket) return;
  socket.emit('room:join', { address });
}

export function leaveRoom(address: string): void {
  if (!socket) return;
  socket.emit('room:leave', { address });
}

export function markMessageRead(messageId: string, conversationId: string): void {
  if (!socket) return;
  socket.emit('message:read', { messageId, conversationId });
}

export function requestOnlineStatus(addresses: string[]): void {
  if (!socket) return;
  socket.emit('status:query', { addresses });
}
