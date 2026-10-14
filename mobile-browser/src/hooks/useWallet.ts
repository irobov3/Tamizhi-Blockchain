import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getBalance, formatBalance, WalletBalance } from '../api/chain';
import { getStoredMnemonic } from '../crypto/wallet';

export interface UseWalletReturn {
  address: string | null;
  balances: WalletBalance[];
  formattedBalance: string;
  mnemonic: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useWallet(): UseWalletReturn {
  const identity = useStore((s) => s.identity);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!identity?.walletAddress) return;
    setIsLoading(true);
    try {
      const result = await getBalance(identity.walletAddress);
      setBalances(result);
    } catch {
      // Chain unavailable — keep previous balances
    } finally {
      setIsLoading(false);
    }
  }, [identity?.walletAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    getStoredMnemonic().then(setMnemonic);
  }, []);

  return {
    address: identity?.walletAddress ?? null,
    balances,
    formattedBalance: formatBalance(balances),
    mnemonic,
    isLoading,
    refresh,
  };
}
