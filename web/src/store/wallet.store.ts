import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSigningClient, getBalance as fetchBalance, formatAmount, connectKeplr } from '@/lib/chain';

export interface Transaction {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  memo: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  blockHeight?: number;
  fee?: string;
}

export interface Balance {
  tmz: string;
  utmz: string;
}

interface WalletState {
  walletAddress: string | null;
  mnemonic: string | null;
  keplrName: string | null;
  connectMode: 'keplr' | 'mnemonic' | null;
  balance: Balance | null;
  isConnected: boolean;
  isLoading: boolean;
  transactions: Transaction[];
  error: string | null;
}

interface WalletActions {
  connectWallet: (mnemonic: string) => Promise<void>;
  connectWithKeplr: () => Promise<void>;
  disconnectWallet: () => void;
  updateBalance: () => Promise<void>;
  addTransaction: (tx: Transaction) => void;
  updateTransactionStatus: (txHash: string, status: Transaction['status']) => void;
  clearError: () => void;
}

type WalletStore = WalletState & WalletActions;

// Simple XOR-based obfuscation for localStorage (not real encryption — use server-side for production secrets)
function obfuscate(str: string): string {
  const key = 'tamizhi_secure_2024';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function deobfuscate(str: string): string {
  try {
    const key = 'tamizhi_secure_2024';
    const decoded = atob(str);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return str;
  }
}

const secureStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(name);
      if (!item) return null;
      const parsed = JSON.parse(deobfuscate(item));
      return JSON.stringify(parsed);
    } catch {
      return localStorage.getItem(name);
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const obfuscated = obfuscate(value);
      localStorage.setItem(name, obfuscated);
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      mnemonic: null,
      keplrName: null,
      connectMode: null,
      balance: null,
      isConnected: false,
      isLoading: false,
      transactions: [],
      error: null,

      connectWithKeplr: async () => {
        set({ isLoading: true, error: null });
        try {
          const { address, name } = await connectKeplr();
          let balance: Balance = { tmz: '0.000000', utmz: '0' };
          try {
            balance = await fetchBalance(address);
          } catch { /* node may be offline */ }

          set({
            walletAddress: address,
            keplrName: name,
            mnemonic: null,
            connectMode: 'keplr',
            balance,
            isConnected: true,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to connect Keplr';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      connectWallet: async (mnemonic: string) => {
        set({ isLoading: true, error: null });
        try {
          const client = await getSigningClient(mnemonic);
          const accounts = await client.signer.getAccounts();
          const address = accounts[0].address;

          let balance: Balance = { tmz: '0.000000', utmz: '0' };
          try {
            balance = await fetchBalance(address);
          } catch {
            // Balance fetch may fail if node is offline
          }

          set({
            walletAddress: address,
            mnemonic,
            connectMode: 'mnemonic',
            balance,
            isConnected: true,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to connect wallet';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      disconnectWallet: () => {
        set({
          walletAddress: null,
          mnemonic: null,
          keplrName: null,
          connectMode: null,
          balance: null,
          isConnected: false,
          transactions: [],
          error: null,
        });
      },

      updateBalance: async () => {
        const { walletAddress } = get();
        if (!walletAddress) return;
        try {
          const balance = await fetchBalance(walletAddress);
          set({ balance });
        } catch (error) {
          console.error('Failed to update balance:', error);
        }
      },

      addTransaction: (tx: Transaction) => {
        set((state) => ({
          transactions: [tx, ...state.transactions].slice(0, 100), // Keep last 100
        }));
      },

      updateTransactionStatus: (txHash: string, status: Transaction['status']) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.txHash === txHash ? { ...tx, status } : tx
          ),
        }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tamizhi-wallet',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        mnemonic: state.mnemonic,
        keplrName: state.keplrName,
        connectMode: state.connectMode,
        transactions: state.transactions,
        isConnected: state.isConnected,
      }),
    }
  )
);
