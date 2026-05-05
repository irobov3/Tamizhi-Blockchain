'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_RELAY_URL = process.env.NEXT_PUBLIC_WS_RELAY_URL || 'ws://localhost:3002';

// ─── Shared event types (mirrored from TamizhiWsClient) ───────────────────────

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

export interface LatestBlock {
  height: number;
  time: string;
  proposer: string;
  txCount: number;
  timestamp: string;
}

export interface LatestTx {
  txHash: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface RewardEvent {
  txHash?: string;
  employeeId?: string;
  ruleId?: string;
  amount?: string;
  timestamp: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ChainEventsState {
  latestBlock: LatestBlock | null;
  latestTx: LatestTx | null;
  rewardEvents: RewardEvent[];
  isConnected: boolean;
}

export function useChainEvents(): ChainEventsState {
  const [latestBlock, setLatestBlock] = useState<LatestBlock | null>(null);
  const [latestTx, setLatestTx] = useState<LatestTx | null>(null);
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const unmountedRef = useRef(false);

  const handleEvent = useCallback((event: ChainEvent) => {
    switch (event.type) {
      case 'connected':
        setIsConnected(true);
        break;

      case 'new_block':
        setLatestBlock({
          height: event.height ?? 0,
          time: (event.data.time as string) ?? '',
          proposer: (event.data.proposer as string) ?? '',
          txCount: (event.data.txCount as number) ?? 0,
          timestamp: event.timestamp,
        });
        break;

      case 'tx':
        if (event.txHash) {
          setLatestTx({
            txHash: event.txHash,
            timestamp: event.timestamp,
            data: event.data,
          });
        }
        break;

      case 'reward_issued':
        setRewardEvents((prev) => [
          {
            txHash: event.txHash,
            employeeId: event.data.employeeId as string | undefined,
            ruleId: event.data.ruleId as string | undefined,
            amount: event.data.amount as string | undefined,
            timestamp: event.timestamp,
          },
          // Keep last 50 reward events
          ...prev.slice(0, 49),
        ]);
        break;

      default:
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const ws = new WebSocket(WS_RELAY_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as ChainEvent;
        handleEvent(event);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setIsConnected(false);
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, 30000);
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [handleEvent]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  return { latestBlock, latestTx, rewardEvents, isConnected };
}
