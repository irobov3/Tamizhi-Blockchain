/**
 * Built-in browser wallet store (STUB).
 *
 * NOTE: This is a basic in-memory keystore for the browser's Web3 provider.
 * It should later be unified with the keystore in `mobile-wallet/` so that
 * the user has a single mnemonic across the messenger / wallet / browser.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'tamizhi.browser.wallet.v1';

export interface WalletAccount {
  address: string;
  publicKey: string;
  // STUB: the real implementation should keep encrypted mnemonic only.
  mnemonic?: string;
}

interface WalletState {
  account: WalletAccount | null;
  address: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setAccount: (a: WalletAccount | null) => void;
  clear: () => void;
}

async function persist(account: WalletAccount | null) {
  try {
    if (account) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(account));
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch (e) {
    console.warn('wallet persist failed', e);
  }
}

export const useWalletStore = create<WalletState>((set, get) => ({
  account: null,
  address: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const account = JSON.parse(raw) as WalletAccount;
        set({ account, address: account.address, hydrated: true });
        return;
      }
    } catch (e) {
      console.warn('wallet hydrate failed', e);
    }
    set({ hydrated: true });
  },

  setAccount: (account) => {
    persist(account);
    set({ account, address: account?.address ?? null });
  },

  clear: () => {
    persist(null);
    set({ account: null, address: null });
  },
}));
