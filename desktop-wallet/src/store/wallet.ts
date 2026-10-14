import { create } from "zustand";
import {
  listWallets,
  unlockWallet,
  type StoredWalletMeta,
} from "../wallet/keystore";
import type { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

type WalletState = {
  wallets: StoredWalletMeta[];
  active: StoredWalletMeta | null;
  signer: DirectSecp256k1HdWallet | null;
  locked: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  setActive: (id: string) => void;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
};

export const useWallet = create<WalletState>((set, get) => ({
  wallets: [],
  active: null,
  signer: null,
  locked: true,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    const wallets = await listWallets();
    const active =
      get().active && wallets.find((w) => w.id === get().active?.id)
        ? get().active
        : wallets[0] ?? null;
    set({ wallets, active, loading: false });
  },
  setActive: (id: string) => {
    const w = get().wallets.find((x) => x.id === id) ?? null;
    set({ active: w, signer: null, locked: true });
  },
  unlock: async (password: string) => {
    const a = get().active;
    if (!a) throw new Error("Select a wallet first");
    const signer = await unlockWallet(a.id, password);
    set({ signer, locked: false });
  },
  lock: () => set({ signer: null, locked: true }),
}));
