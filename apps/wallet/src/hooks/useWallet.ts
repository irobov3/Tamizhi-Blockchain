'use client';

import { useState, useCallback, useEffect } from 'react';
import { connectKeplr, getSigningClient, isKeplrAvailable } from '@/lib/keplr';
import { getBalance } from '@/lib/api';

const UTMZ_FACTOR = 1_000_000;

export interface WalletState {
  address: string;
  balance: string;       // human-readable TMZ
  balanceUtmz: string;   // raw utmz string
  isConnected: boolean;
  isLoading: boolean;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  // Legacy aliases kept for existing pages
  isConnecting: boolean;
  refreshBalance: () => Promise<void>;
  client: any;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState('');
  const [balanceUtmz, setBalanceUtmz] = useState('0');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [client, setClient] = useState<any>(null);

  const loadBalance = useCallback(async (addr: string) => {
    try {
      const utmz = await getBalance(addr);
      setBalanceUtmz(utmz);
    } catch {
      setBalanceUtmz('0');
    }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!isKeplrAvailable()) {
        throw new Error('Keplr extension not found. Please install Keplr.');
      }
      const addr = await connectKeplr();
      setAddress(addr);
      await loadBalance(addr);
      // Also get the signing client and cache it
      try {
        const { client: sc } = await getSigningClient();
        setClient(sc);
      } catch {
        // signing client is optional for read-only usage
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, [loadBalance]);

  const disconnect = useCallback(() => {
    if (client) {
      try { client.disconnect(); } catch { /* ignore */ }
    }
    setAddress('');
    setBalanceUtmz('0');
    setError('');
    setClient(null);
  }, [client]);

  const refresh = useCallback(async () => {
    if (!address) return;
    await loadBalance(address);
  }, [address, loadBalance]);

  // React to Keplr account changes
  useEffect(() => {
    const handler = () => {
      if (address) connect();
    };
    window.addEventListener('keplr_keystorechange', handler);
    return () => window.removeEventListener('keplr_keystorechange', handler);
  }, [address, connect]);

  const balanceTMZ = (parseInt(balanceUtmz, 10) / UTMZ_FACTOR).toFixed(6);

  return {
    address,
    balance: balanceTMZ,
    balanceUtmz,
    isConnected: !!address,
    isLoading,
    error,
    connect,
    disconnect,
    refresh,
    // Legacy aliases
    isConnecting: isLoading,
    refreshBalance: refresh,
    client,
  };
}
