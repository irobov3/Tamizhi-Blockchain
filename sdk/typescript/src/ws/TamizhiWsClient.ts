export type ChainEventType =
  | 'new_block'
  | 'tx'
  | 'reward_issued'
  | 'node_jailed'
  | 'threat_flagged'
  | 'work_submitted'
  | 'connected';

export interface ChainEvent {
  type: ChainEventType;
  height?: number;
  txHash?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export type EventHandler = (event: ChainEvent) => void;

export class TamizhiWsClient {
  private ws: WebSocket | null = null;
  private handlers: Map<ChainEventType | '*', EventHandler[]> = new Map();
  private reconnectDelay = 1000;
  private url: string;

  constructor(url = 'ws://localhost:3002') {
    this.url = url;
  }

  connect(): this {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ChainEvent;
        this.emit(event);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };

    return this;
  }

  on(type: ChainEventType | '*', handler: EventHandler): this {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
    return this;
  }

  off(type: ChainEventType | '*', handler: EventHandler): this {
    const list = this.handlers.get(type) || [];
    this.handlers.set(type, list.filter((h) => h !== handler));
    return this;
  }

  private emit(event: ChainEvent) {
    (this.handlers.get(event.type) || []).forEach((h) => h(event));
    (this.handlers.get('*') || []).forEach((h) => h(event));
  }

  disconnect() {
    this.ws?.close();
  }
}
