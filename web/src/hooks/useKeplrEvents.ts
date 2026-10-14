'use client';

import { useEffect } from 'react';
import { useWalletStore } from '@/store/wallet.store';

/**
 * Listens for the `keplr_keystorechange` window event, which fires when the
 * user switches accounts or chains inside the Keplr / Leap extension.
 * When it fires and the wallet is in Keplr mode, we re-connect to pick up the
 * new address and refresh the balance.
 */
export function useKeplrEvents() {
  const { connectMode, connectWithKeplr, disconnectWallet } = useWalletStore();

  useEffect(() => {
    if (connectMode !== 'keplr') return;

    const handleKeystoreChange = async () => {
      try {
        await connectWithKeplr();
      } catch {
        // If the extension becomes unavailable, disconnect cleanly.
        disconnectWallet();
      }
    };

    window.addEventListener('keplr_keystorechange', handleKeystoreChange);
    return () => window.removeEventListener('keplr_keystorechange', handleKeystoreChange);
  }, [connectMode, connectWithKeplr, disconnectWallet]);
}
