/**
 * lib/store.ts
 * Zustand wallet store for Tamizhi mobile wallet.
 * Holds in-memory wallet state — nothing sensitive is persisted here.
 */

import { create } from 'zustand';

export interface WalletState {
  /** Derived tamizhi1... address, empty string when locked */
  address: string;
  /** Raw utmz balance string, e.g. "1000000" */
  balance: string;
  /** BIP39 mnemonic — only in memory after unlock, cleared on lock */
  mnemonic: string;
  /** Whether the wallet is currently unlocked */
  isUnlocked: boolean;

  setAddress: (a: string) => void;
  setBalance: (b: string) => void;
  setMnemonic: (m: string) => void;
  setUnlocked: (u: boolean) => void;

  /** Convenience: unlock wallet by setting all fields at once */
  unlock: (mnemonic: string, address: string) => void;
  /** Convenience: clear sensitive in-memory data */
  lock: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: '',
  balance: '0',
  mnemonic: '',
  isUnlocked: false,

  setAddress: (address) => set({ address }),
  setBalance: (balance) => set({ balance }),
  setMnemonic: (mnemonic) => set({ mnemonic }),
  setUnlocked: (isUnlocked) => set({ isUnlocked }),

  unlock: (mnemonic, address) =>
    set({ mnemonic, address, isUnlocked: true }),

  lock: () =>
    set({ mnemonic: '', address: '', balance: '0', isUnlocked: false }),
}));
