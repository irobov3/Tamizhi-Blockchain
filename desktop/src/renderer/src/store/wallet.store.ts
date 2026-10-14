import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StoredWallet, Transaction } from '../../../shared/types';

interface WalletState {
  address: string | null;
  balance: string;
  formattedBalance: string;
  transactions: Transaction[];
  isConnected: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  x25519Secret: string | null; // held in memory only, never persisted

  // Actions
  loadWallet: () => Promise<void>;
  createWallet: () => Promise<{ mnemonic: string; address: string }>;
  importWallet: (mnemonic: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTokens: (to: string, amount: string, memo: string) => Promise<string>;
  fetchTransactions: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      balance: '0',
      formattedBalance: '0 TMZ',
      transactions: [],
      isConnected: false,
      isLoaded: false,
      isLoading: false,
      error: null,
      x25519Secret: null,

      // MARK: - Load Wallet from DB

      loadWallet: async () => {
        try {
          const wallet = await window.tamizhi.db.getWallet();
          if (wallet) {
            const result = await window.tamizhi.crypto.generateWallet(wallet.encrypted_mnemonic);
            set({ address: wallet.address, isConnected: true, isLoaded: true, x25519Secret: result.x25519Secret });
            get().refreshBalance().catch(() => null);
            get().fetchTransactions().catch(() => null);
          } else {
            set({ isLoaded: true });
          }
        } catch {
          set({ isLoaded: true });
        }
      },

      // MARK: - Create Wallet

      createWallet: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await window.tamizhi.crypto.generateWallet();

          const storedWallet: StoredWallet = {
            address: result.address,
            public_key: result.publicKey,
            encrypted_mnemonic: result.mnemonic, // In production: encrypt with a password
            x25519_public: result.x25519Public,
          };

          await window.tamizhi.db.saveWallet(storedWallet);

          set({
            address: result.address,
            isConnected: true,
            isLoading: false,
            x25519Secret: result.x25519Secret,
          });

          // Fetch initial balance (non-fatal)
          get().refreshBalance().catch(() => null);

          return { mnemonic: result.mnemonic, address: result.address };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to create wallet';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      // MARK: - Import Wallet

      importWallet: async (mnemonic: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await window.tamizhi.crypto.generateWallet(mnemonic);

          const storedWallet: StoredWallet = {
            address: result.address,
            public_key: result.publicKey,
            encrypted_mnemonic: mnemonic,
            x25519_public: result.x25519Public,
          };

          await window.tamizhi.db.saveWallet(storedWallet);

          set({
            address: result.address,
            isConnected: true,
            isLoading: false,
            x25519Secret: result.x25519Secret,
          });

          await get().refreshBalance();
          await get().fetchTransactions();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to import wallet';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      // MARK: - Refresh Balance

      refreshBalance: async () => {
        const { address } = get();
        if (!address) return;

        try {
          const resp = await fetch(
            `${import.meta.env.VITE_LCD_URL ?? 'http://localhost:1317'}/cosmos/bank/v1beta1/balances/${address}`
          );
          if (!resp.ok) throw new Error('LCD error');

          const data = await resp.json() as { balances: Array<{ denom: string; amount: string }> };
          const tmzCoin = data.balances.find((b) => b.denom === 'utmz');
          const raw = tmzCoin?.amount ?? '0';
          const tmz = (parseInt(raw, 10) / 1_000_000).toFixed(6);

          set({ balance: raw, formattedBalance: `${tmz} TMZ` });
        } catch {
          // Non-fatal — keep previous balance
        }
      },

      // MARK: - Send Tokens

      sendTokens: async (to: string, amount: string, memo: string) => {
        const { address, x25519Secret } = get();
        if (!address) throw new Error('No wallet connected');

        set({ isLoading: true, error: null });
        try {
          const wallet = await window.tamizhi.db.getWallet();
          if (!wallet) throw new Error('Wallet not found in database');

          // Build and broadcast a bank send tx via backend API
          const resp = await fetch(
            `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1/wallet/send`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: address,
                to,
                amount,
                denom: 'utmz',
                memo,
                mnemonic: wallet.encrypted_mnemonic,
              }),
            }
          );

          if (!resp.ok) {
            const err = await resp.json() as { error?: string };
            throw new Error(err.error ?? 'Transaction failed');
          }

          const result = await resp.json() as { txHash: string };
          set({ isLoading: false });

          // Refresh balance after send
          setTimeout(() => get().refreshBalance(), 3000);

          return result.txHash;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Send failed';
          set({ isLoading: false, error: message });
          throw err;
        }

        void x25519Secret; // not needed for sends
      },

      // MARK: - Fetch Transactions

      fetchTransactions: async () => {
        const { address } = get();
        if (!address) return;

        try {
          const resp = await fetch(
            `${import.meta.env.VITE_LCD_URL ?? 'http://localhost:1317'}/cosmos/tx/v1beta1/txs?events=transfer.sender%3D%27${address}%27&limit=50`
          );
          if (!resp.ok) return;

          const data = await resp.json() as {
            txs: Array<{
              txhash: string;
              height: string;
              timestamp: string;
              tx: { body: { memo: string; messages: Array<{ '@type': string; amount: Array<{ amount: string; denom: string }>; from_address: string; to_address: string }> } };
              code?: number;
            }>;
          };

          const transactions: Transaction[] = (data.txs ?? []).map((tx) => {
            const msg = tx.tx.body.messages[0];
            const coin = msg?.amount?.[0];
            return {
              hash: tx.txhash,
              height: parseInt(tx.height, 10),
              timestamp: tx.timestamp,
              type: msg?.['@type']?.split('.').pop() ?? 'Unknown',
              from: msg?.from_address,
              to: msg?.to_address,
              amount: coin ? (parseInt(coin.amount, 10) / 1_000_000).toFixed(6) : undefined,
              denom: coin?.denom,
              memo: tx.tx.body.memo,
              status: tx.code === 0 || tx.code === undefined ? 'success' : 'failed',
            };
          });

          set({ transactions });
        } catch {
          // Non-fatal
        }
      },

      // MARK: - Disconnect

      disconnect: () => {
        set({
          address: null,
          balance: '0',
          formattedBalance: '0 TMZ',
          transactions: [],
          isConnected: false,
          x25519Secret: null,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tamizhi-wallet',
      storage: createJSONStorage(() => localStorage),
      // Never persist the x25519 secret
      partialize: (state) => ({
        address: state.address,
        balance: state.balance,
        formattedBalance: state.formattedBalance,
        isConnected: state.isConnected,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.address) {
          // Re-load x25519Secret from DB on startup
          window.tamizhi?.db.getWallet().then((wallet) => {
            if (wallet) {
              window.tamizhi.crypto
                .generateWallet(wallet.encrypted_mnemonic)
                .then((result) => {
                  useWalletStore.setState({ x25519Secret: result.x25519Secret, isLoaded: true });
                })
                .catch(() => useWalletStore.setState({ isLoaded: true }));
            } else {
              useWalletStore.setState({ isLoaded: true });
            }
          }).catch(() => useWalletStore.setState({ isLoaded: true }));

          setTimeout(() => useWalletStore.getState().refreshBalance(), 500);
        } else {
          useWalletStore.setState({ isLoaded: true });
        }
      },
    }
  )
);
