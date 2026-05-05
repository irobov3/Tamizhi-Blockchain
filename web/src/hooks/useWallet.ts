import { useCallback } from 'react';
import { useWalletStore } from '@/store/wallet.store';
import { sendTokens as chainSendTokens, getBalance as chainGetBalance } from '@/lib/chain';
import { signMessage, deriveKeyPairFromMnemonic, exportKey } from '@/lib/crypto';
import { decodeUTF8 } from 'tweetnacl-util';

export function useWallet() {
  const {
    walletAddress,
    mnemonic,
    balance,
    isConnected,
    isLoading,
    transactions,
    error,
    connectWallet,
    disconnectWallet,
    updateBalance,
    addTransaction,
    clearError,
  } = useWalletStore();

  const sendTokens = useCallback(
    async ({
      to,
      amount,
      memo = '',
    }: {
      to: string;
      amount: string;
      memo?: string;
    }) => {
      if (!walletAddress || !mnemonic) {
        throw new Error('Wallet not connected');
      }

      const result = await chainSendTokens({
        from: walletAddress,
        to,
        amount,
        memo,
        mnemonic,
      });

      addTransaction({
        txHash: result.txHash,
        from: walletAddress,
        to,
        amount,
        memo,
        status: 'success',
        timestamp: new Date().toISOString(),
        blockHeight: result.height,
      });

      await updateBalance();

      return result;
    },
    [walletAddress, mnemonic, addTransaction, updateBalance]
  );

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return null;
    return chainGetBalance(walletAddress);
  }, [walletAddress]);

  const signArbitrary = useCallback(
    async (message: string): Promise<{ signature: string; publicKey: string }> => {
      if (!mnemonic) {
        throw new Error('Wallet not connected');
      }

      const keyPair = await deriveKeyPairFromMnemonic(mnemonic);
      const messageBytes = decodeUTF8(message);
      const { default: nacl } = await import('tweetnacl');
      const signingKeyPair = nacl.sign.keyPair.fromSeed(keyPair.secretKey);
      const signatureBytes = nacl.sign.detached(messageBytes, signingKeyPair.secretKey);

      return {
        signature: exportKey(signatureBytes),
        publicKey: exportKey(signingKeyPair.publicKey),
      };
    },
    [mnemonic]
  );

  const getChatKeyPair = useCallback(async () => {
    if (!mnemonic) {
      throw new Error('Wallet not connected');
    }
    const keyPair = await deriveKeyPairFromMnemonic(mnemonic);
    return {
      publicKey: exportKey(keyPair.publicKey),
      secretKey: keyPair.secretKey,
    };
  }, [mnemonic]);

  return {
    // State
    address: walletAddress,
    mnemonic,
    balance,
    isConnected,
    isLoading,
    transactions,
    error,

    // Actions
    connectWallet,
    disconnectWallet,
    updateBalance,
    sendTokens,
    refreshBalance,
    signArbitrary,
    getChatKeyPair,
    clearError,
  };
}
