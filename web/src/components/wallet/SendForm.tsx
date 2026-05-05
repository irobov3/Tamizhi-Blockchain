'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, AlertTriangle, CheckCircle, Fuel, ArrowRight } from 'lucide-react';
import { useWalletStore } from '@/store/wallet.store';
import {
  sendTokens, sendTokensKeplr, isValidAddress, toUtmz, formatAmount, estimateGas, estimateGasKeplr,
} from '@/lib/chain';
import { Spinner } from '@/components/ui/Spinner';
import { clsx } from 'clsx';

type AmountUnit = 'TMZ' | 'utmz';

export function SendForm() {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [unit, setUnit] = useState<AmountUnit>('TMZ');
  const [gasEstimate, setGasEstimate] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estimatingGas, setEstimatingGas] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { walletAddress, mnemonic, connectMode, balance, addTransaction, updateBalance } = useWalletStore();

  const addressError = toAddress && !isValidAddress(toAddress) ? 'Invalid Tamizhi address' : '';
  const amountError = amount && parseFloat(amount) <= 0 ? 'Amount must be greater than 0' : '';

  const tmzAmount = unit === 'TMZ' ? amount : amount ? (parseFloat(amount) / 1_000_000).toFixed(6) : '';
  const isFormValid =
    toAddress && isValidAddress(toAddress) && amount && parseFloat(amount) > 0 && !addressError &&
    (connectMode === 'keplr' || !!mnemonic);

  const handleEstimateGas = async () => {
    if (!isFormValid || !walletAddress) return;
    setEstimatingGas(true);
    try {
      const tmz = unit === 'TMZ' ? amount : (parseFloat(amount) / 1_000_000).toString();
      let gas: number;
      if (connectMode === 'keplr') {
        gas = await estimateGasKeplr(walletAddress, toAddress, tmz, memo);
      } else {
        if (!mnemonic) return;
        gas = await estimateGas(mnemonic, walletAddress, toAddress, tmz, memo);
      }
      setGasEstimate(gas);
    } catch {
      setGasEstimate(80000);
    } finally {
      setEstimatingGas(false);
    }
  };

  const handlePreview = async () => {
    if (!isFormValid) return;
    await handleEstimateGas();
    setShowConfirm(true);
  };

  const handleSend = async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const tmz = unit === 'TMZ' ? amount : (parseFloat(amount) / 1_000_000).toString();

      let result;
      if (connectMode === 'keplr') {
        result = await sendTokensKeplr({ from: walletAddress, to: toAddress, amount: tmz, memo });
      } else {
        if (!mnemonic) throw new Error('No wallet key available');
        result = await sendTokens({ from: walletAddress, to: toAddress, amount: tmz, memo, mnemonic });
      }

      addTransaction({
        txHash: result.txHash,
        from: walletAddress,
        to: toAddress,
        amount: tmz,
        memo,
        status: 'success',
        timestamp: new Date().toISOString(),
        blockHeight: result.height,
      });

      await updateBalance();

      setSuccess(result.txHash);
      setShowConfirm(false);
      setToAddress('');
      setAmount('');
      setMemo('');
      setGasEstimate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-400 font-semibold text-sm">Transaction Sent!</p>
            <p className="text-green-400/70 text-xs font-mono mt-0.5 break-all">{success}</p>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* To Address */}
      <div>
        <label className="block text-sm text-text-secondary mb-1.5">
          Recipient Address
        </label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value.trim())}
          placeholder="tamizhi1..."
          className={clsx(
            'w-full bg-surface-DEFAULT border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors font-mono',
            addressError
              ? 'border-red-500/50 focus:border-red-500'
              : 'border-background-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500'
          )}
        />
        {addressError && (
          <p className="text-red-400 text-xs mt-1">{addressError}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm text-text-secondary mb-1.5">Amount</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000000"
              min="0"
              step={unit === 'TMZ' ? '0.000001' : '1'}
              className={clsx(
                'w-full bg-surface-DEFAULT border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors',
                amountError
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-background-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500'
              )}
            />
          </div>
          <div className="flex rounded-xl border border-background-border overflow-hidden">
            {(['TMZ', 'utmz'] as AmountUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={clsx(
                  'px-3 py-3 text-sm font-medium transition-colors',
                  unit === u
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-DEFAULT text-text-secondary hover:text-white'
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        {amountError && <p className="text-red-400 text-xs mt-1">{amountError}</p>}
        {amount && !amountError && (
          <p className="text-text-muted text-xs mt-1">
            {unit === 'TMZ'
              ? `= ${toUtmz(amount)} utmz`
              : `= ${(parseFloat(amount) / 1_000_000).toFixed(6)} TMZ`}
          </p>
        )}
        {balance && (
          <p className="text-text-muted text-xs mt-1">
            Balance: <span className="text-text-secondary">{balance.tmz} TMZ</span>
          </p>
        )}
      </div>

      {/* Memo */}
      <div>
        <label className="block text-sm text-text-secondary mb-1.5">
          Memo <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Add a note..."
          maxLength={256}
          className="w-full bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      {/* Gas Estimate */}
      {gasEstimate !== null && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-DEFAULT border border-background-border">
          <Fuel className="w-4 h-4 text-text-muted" />
          <span className="text-text-secondary text-sm">
            Estimated Gas: <span className="text-text-primary font-mono">{gasEstimate.toLocaleString()}</span>
          </span>
          <span className="text-text-muted text-xs ml-auto">
            ≈ {((gasEstimate * 0.025) / 1_000_000).toFixed(6)} TMZ fee
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleEstimateGas}
          disabled={!isFormValid || estimatingGas}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-background-border text-text-secondary hover:text-white disabled:opacity-50 text-sm transition-colors"
        >
          {estimatingGas ? <Spinner size="sm" /> : <Fuel className="w-4 h-4" />}
          Estimate Gas
        </button>
        <button
          onClick={handlePreview}
          disabled={!isFormValid || loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          <Send className="w-4 h-4" />
          Preview Send
        </button>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-background-card border border-background-border rounded-2xl p-6 shadow-card-hover"
          >
            <h3 className="text-lg font-bold text-white mb-4">Confirm Transaction</h3>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-DEFAULT">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-muted mb-0.5">From</div>
                  <div className="text-sm text-text-primary font-mono truncate">{walletAddress}</div>
                </div>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-text-muted" />
              </div>
              <div className="p-3 rounded-xl bg-surface-DEFAULT">
                <div className="text-xs text-text-muted mb-0.5">To</div>
                <div className="text-sm text-text-primary font-mono truncate">{toAddress}</div>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <span className="text-text-secondary text-sm">Amount</span>
                <span className="text-primary-400 font-bold">
                  {unit === 'TMZ' ? amount : (parseFloat(amount) / 1_000_000).toFixed(6)} TMZ
                </span>
              </div>
              {memo && (
                <div className="flex justify-between p-3 rounded-xl bg-surface-DEFAULT">
                  <span className="text-text-muted text-sm">Memo</span>
                  <span className="text-text-secondary text-sm">{memo}</span>
                </div>
              )}
              {gasEstimate && (
                <div className="flex justify-between p-3 rounded-xl bg-surface-DEFAULT">
                  <span className="text-text-muted text-sm">Est. Fee</span>
                  <span className="text-text-secondary text-sm font-mono">
                    {((gasEstimate * 0.025) / 1_000_000).toFixed(6)} TMZ
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setError(''); }}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-background-border text-text-secondary hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                {loading ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
                {loading ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
