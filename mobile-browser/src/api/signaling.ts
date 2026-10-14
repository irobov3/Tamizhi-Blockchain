/**
 * Tamizhi WebRTC Signaling Client
 *
 * Connects to the storage server's WebSocket endpoint:
 *   ws://host:8100/ws/signal?pubkey=<myPubKey>
 *
 * All messages are routed by the server to the target pubkey.
 */

import { CONFIG } from '../config';

export type SignalType =
  | 'call-offer'
  | 'call-answer'
  | 'ice-candidate'
  | 'call-reject'
  | 'call-end'
  | 'call-busy'
  | 'peer-offline'
  | 'ping';

export interface SignalMessage {
  type: SignalType;
  from: string;
  to: string;
  data?: any;
}

type SignalHandler = (msg: SignalMessage) => void;

class SignalingClient {
  private ws: WebSocket | null = null;
  private pubKey: string | null = null;
  private handlers: Map<SignalType | '*', SignalHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private reconnectDelay = 2000;

  /** Connect to the signaling server with our pubkey. */
  connect(pubKey: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.pubKey === pubKey) {
      return; // already connected
    }
    this.pubKey = pubKey;
    this.shouldReconnect = true;
    this._open();
  }

  private _open(): void {
    if (!this.pubKey) return;

    const wsBase = CONFIG.STORAGE_SERVER_URL.replace(/^http/, 'ws');
    const url = `${wsBase}/ws/signal?pubkey=${encodeURIComponent(this.pubKey)}`;

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.error('[signal] WebSocket constructor error:', e);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[signal] connected');
      this.reconnectDelay = 2000; // reset backoff
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: SignalMessage = JSON.parse(event.data);
        this._dispatch(msg);
      } catch (e) {
        console.warn('[signal] bad message:', event.data);
      }
    };

    this.ws.onerror = (e) => {
      console.warn('[signal] error:', e);
    };

    this.ws.onclose = () => {
      console.log('[signal] disconnected');
      if (this.shouldReconnect) {
        this._scheduleReconnect();
      }
    };
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
      this._open();
    }, this.reconnectDelay);
  }

  /** Disconnect and stop reconnecting. */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  /** Send a signal message to a peer. */
  send(msg: SignalMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[signal] not connected, cannot send', msg.type);
      return false;
    }
    // Ensure from is set to our pubkey
    const payload = { ...msg, from: this.pubKey };
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  /** Register a handler for a specific message type. Use '*' to catch all. */
  on(type: SignalType | '*', handler: SignalHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /** Remove a handler. */
  off(type: SignalType | '*', handler: SignalHandler): void {
    const list = this.handlers.get(type);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  private _dispatch(msg: SignalMessage): void {
    // Dispatch to specific handlers
    const specific = this.handlers.get(msg.type);
    specific?.forEach((h) => h(msg));
    // Dispatch to wildcard handlers
    const wildcard = this.handlers.get('*');
    wildcard?.forEach((h) => h(msg));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton — one signaling connection per app session.
export const signalingClient = new SignalingClient();
