'use client';

import { useState, useCallback, useEffect } from 'react';
import { SigningStargateClient, StargateClient } from '@cosmjs/stargate';

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 'tamizhi-testnet-1';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:26657';
const DENOM = 'utmz';
const TMZ_FACTOR = 1_000_000;

export interface WalletState {
  address: string | null;
  balance: string | null; // in TMZ (human-readable)
  balanceUtmz: string | null; // raw utmz
  client: SigningStargateClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getKey: (chainId: string) => Promise<{ bech32Address: string; name: string }>;
      getOfflineSigner: (chainId: string) => any;
    };
    leap?: {
      enable: (chainId: string) => Promise<void>;
      getKey: (chainId: string) => Promise<{ bech32Address: string; name: string }>;
      getOfflineSigner: (chainId: string) => any;
    };
  }
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceUtmz, setBalanceUtmz] = useState<string | null>(null);
  const [client, setClient] = useState<SigningStargateClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      // Use a read-only client for balance if signing client is not yet set
      const queryClient = await StargateClient.connect(RPC_URL);
      const coin = await queryClient.getBalance(address, DENOM);
      const utmzAmount = coin?.amount ?? '0';
      setBalanceUtmz(utmzAmount);
      const tmzAmount = (parseInt(utmzAmount, 10) / TMZ_FACTOR).toFixed(6);
      setBalance(tmzAmount);
      queryClient.disconnect();
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [address]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // Prefer Keplr, fall back to Leap
      const wallet = window.keplr ?? window.leap;
      if (!wallet) {
        throw new Error('No wallet extension found. Please install Keplr or Leap.');
      }

      await wallet.enable(CHAIN_ID);
      const key = await wallet.getKey(CHAIN_ID);
      const offlineSigner = wallet.getOfflineSigner(CHAIN_ID);

      const signingClient = await SigningStargateClient.connectWithSigner(
        RPC_URL,
        offlineSigner,
      );

      setAddress(key.bech32Address);
      setClient(signingClient);

      // Fetch balance
      const coin = await signingClient.getBalance(key.bech32Address, DENOM);
      const utmzAmount = coin?.amount ?? '0';
      setBalanceUtmz(utmzAmount);
      setBalance((parseInt(utmzAmount, 10) / TMZ_FACTOR).toFixed(6));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
    }
    setAddress(null);
    setBalance(null);
    setBalanceUtmz(null);
    setClient(null);
    setError(null);
  }, [client]);

  // Listen for Keplr account changes
  useEffect(() => {
    const handleAccountChange = () => {
      if (address) {
        connect();
      }
    };
    window.addEventListener('keplr_keystorechange', handleAccountChange);
    return () => window.removeEventListener('keplr_keystorechange', handleAccountChange);
  }, [address, connect]);

  return {
    address,
    balance,
    balanceUtmz,
    client,
    isConnected: !!address,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshBalance,
  };
}
