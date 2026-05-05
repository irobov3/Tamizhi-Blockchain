import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

const CHAIN_WS = process.env.CHAIN_WS_URL || 'ws://localhost:26657/websocket';
const PORT = parseInt(process.env.PORT || '3002');

interface ChainEvent {
  type: 'new_block' | 'tx' | 'reward_issued' | 'node_jailed' | 'threat_flagged' | 'work_submitted';
  height?: number;
  txHash?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

class ChainEventRelay extends EventEmitter {
  private chainWs: WebSocket | null = null;
  private clients: Set<WebSocket> = new Set();
  private reconnectDelay = 1000;

  connect() {
    this.chainWs = new WebSocket(CHAIN_WS);

    this.chainWs.on('open', () => {
      console.log('Connected to chain WebSocket');
      this.reconnectDelay = 1000;

      // Subscribe to new blocks
      this.send({ jsonrpc: '2.0', id: 1, method: 'subscribe', params: { query: "tm.event='NewBlock'" } });
      // Subscribe to all transactions
      this.send({ jsonrpc: '2.0', id: 2, method: 'subscribe', params: { query: "tm.event='Tx'" } });
    });

    this.chainWs.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        const event = this.parseChainEvent(msg);
        if (event) {
          this.broadcast(event);
          this.emit('event', event);
        }
      } catch (err) {
        console.error('Parse error:', err);
      }
    });

    this.chainWs.on('close', () => {
      console.log(`Chain WS closed, reconnecting in ${this.reconnectDelay}ms...`);
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    });

    this.chainWs.on('error', (err) => console.error('Chain WS error:', err));
  }

  private send(msg: object) {
    if (this.chainWs?.readyState === WebSocket.OPEN) {
      this.chainWs.send(JSON.stringify(msg));
    }
  }

  private parseChainEvent(msg: any): ChainEvent | null {
    const result = msg?.result;
    if (!result?.data) return null;

    const eventType = result.data.type;
    const value = result.data.value;

    if (eventType === 'tendermint/event/NewBlock') {
      return {
        type: 'new_block',
        height: parseInt(value?.block?.header?.height || '0'),
        data: {
          height: value?.block?.header?.height,
          time: value?.block?.header?.time,
          proposer: value?.block?.header?.proposer_address,
          txCount: value?.block?.data?.txs?.length || 0,
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (eventType === 'tendermint/event/Tx') {
      const events = value?.TxResult?.result?.events || [];
      const tamEvents = events.filter((e: any) =>
        e.type?.startsWith('tamizhi.') || e.type?.startsWith('rewards.') || e.type?.startsWith('nodes.')
      );

      // Detect specific Tamizhi events
      const rewardEvent = events.find((e: any) => e.type === 'reward_issued');
      const jailEvent = events.find((e: any) => e.type === 'jail_node');
      const threatEvent = events.find((e: any) => e.type === 'threat_flagged');
      const workEvent = events.find((e: any) => e.type === 'work_submitted');

      const getAttr = (event: any, key: string) =>
        event?.attributes?.find((a: any) => a.key === key)?.value;

      if (rewardEvent) return {
        type: 'reward_issued',
        txHash: value?.TxResult?.hash,
        data: { employeeId: getAttr(rewardEvent, 'employee_id'), ruleId: getAttr(rewardEvent, 'rule_id'), amount: getAttr(rewardEvent, 'amount') },
        timestamp: new Date().toISOString(),
      };
      if (jailEvent) return {
        type: 'node_jailed',
        txHash: value?.TxResult?.hash,
        data: { nodeId: getAttr(jailEvent, 'node_id'), reason: getAttr(jailEvent, 'reason') },
        timestamp: new Date().toISOString(),
      };
      if (threatEvent) return {
        type: 'threat_flagged',
        txHash: value?.TxResult?.hash,
        data: { address: getAttr(threatEvent, 'address'), level: getAttr(threatEvent, 'level') },
        timestamp: new Date().toISOString(),
      };
      if (workEvent) return {
        type: 'work_submitted',
        txHash: value?.TxResult?.hash,
        data: { workId: getAttr(workEvent, 'work_id'), author: getAttr(workEvent, 'author') },
        timestamp: new Date().toISOString(),
      };

      return {
        type: 'tx',
        txHash: value?.TxResult?.hash,
        data: { events: tamEvents },
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  }

  addClient(ws: WebSocket) {
    this.clients.add(ws);
    console.log(`Client connected. Total: ${this.clients.size}`);
    ws.send(JSON.stringify({ type: 'connected', message: 'Tamizhi WS relay ready' }));
    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`Client disconnected. Total: ${this.clients.size}`);
    });
  }

  private broadcast(event: ChainEvent) {
    const msg = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }
}

// Main
const relay = new ChainEventRelay();
relay.connect();

const wss = new WebSocketServer({ port: PORT });
wss.on('connection', (ws) => relay.addClient(ws));

console.log(`WS relay listening on ws://localhost:${PORT}`);
console.log(`Connecting to chain at ${CHAIN_WS}`);
