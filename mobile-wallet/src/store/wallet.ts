import { create } from 'zustand';

export type Network = 'testnet' | 'mainnet';

export interface CoinAmount {
  denom: string;
  amount: string;
}

interface WalletState {
  address: string | null;
  mnemonic: string | null; // only in memory after unlock; cleared on lock
  balance: CoinAmount[];
  network: Network;
  isLocked: boolean;
  hasWallet: boolean;
  language: 'en' | 'ta';

  setAddress: (addr: string | null) => void;
  setMnemonic: (m: string | null) => void;
  setBalance: (b: CoinAmount[]) => void;
  setNetwork: (n: Network) => void;
  setLocked: (l: boolean) => void;
  setHasWallet: (h: boolean) => void;
  setLanguage: (l: 'en' | 'ta') => void;
  unlock: (mnemonic: string, address: string) => void;
  lock: () => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  mnemonic: null,
  balance: [],
  network: 'testnet',
  isLocked: true,
  hasWallet: false,
  language: 'en',

  setAddress: (address) => set({ address }),
  setMnemonic: (mnemonic) => set({ mnemonic }),
  setBalance: (balance) => set({ balance }),
  setNetwork: (network) => set({ network }),
  setLocked: (isLocked) => set({ isLocked }),
  setHasWallet: (hasWallet) => set({ hasWallet }),
  setLanguage: (language) => set({ language }),

  unlock: (mnemonic, address) =>
    set({ mnemonic, address, isLocked: false, hasWallet: true }),
  lock: () => set({ mnemonic: null, isLocked: true }),
  reset: () =>
    set({
      address: null,
      mnemonic: null,
      balance: [],
      isLocked: true,
      hasWallet: false,
    }),
}));
