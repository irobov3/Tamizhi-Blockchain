/**
 * Tamizhi Call Store (Zustand)
 *
 * Tracks all call state:
 * - Incoming call (show incoming call screen)
 * - Active call (show active call screen)
 * - Call metadata: caller/callee pubkey, call type (audio/video), duration
 */

import { create } from 'zustand';

export type CallState = 'idle' | 'ringing_in' | 'ringing_out' | 'active' | 'ended';
export type CallType = 'audio' | 'video';

export interface CallInfo {
  callId: string;
  remotePubKey: string;
  remoteName: string;
  callType: CallType;
  startedAt: number; // epoch ms
  isOutgoing: boolean;
}

interface CallStore {
  callState: CallState;
  callInfo: CallInfo | null;

  // Actions
  setIncomingCall: (info: CallInfo) => void;
  setOutgoingCall: (info: CallInfo) => void;
  setCallActive: () => void;
  setCallEnded: () => void;
  clearCall: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  callState: 'idle',
  callInfo: null,

  setIncomingCall: (info) =>
    set({ callState: 'ringing_in', callInfo: info }),

  setOutgoingCall: (info) =>
    set({ callState: 'ringing_out', callInfo: info }),

  setCallActive: () =>
    set((s) => ({
      callState: 'active',
      callInfo: s.callInfo
        ? { ...s.callInfo, startedAt: Date.now() }
        : s.callInfo,
    })),

  setCallEnded: () => set({ callState: 'ended' }),

  clearCall: () => set({ callState: 'idle', callInfo: null }),
}));
