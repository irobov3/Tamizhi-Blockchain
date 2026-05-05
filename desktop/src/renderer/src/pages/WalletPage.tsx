import React, { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '../store/wallet.store';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import type { Transaction } from '../../../shared/types';

// MARK: - Helpers

function truncate(str: string, chars = 8): string {
  if (str.length <= chars * 2 + 3) return str;
  return `${str.slice(0, chars)}…${str.slice(-6)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function exportCSV(txs: Transaction[]): void {
  const headers = ['Date', 'Type', 'From', 'To', 'Amount', 'Status', 'Hash', 'Memo'];
  const rows = txs.map((t) => [
    t.timestamp,
    t.type,
    t.from ?? '',
    t.to ?? '',
    t.amount ? `${t.amount} TMZ` : '',
    t.status,
    t.hash,
    t.memo ?? '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tamizhi-transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// MARK: - WalletPage

const WalletPage: React.FC = () => {
  const { address, formattedBalance, transactions, isLoading, refreshBalance, fetchTransactions, sendTokens } =
    useWalletStore();

  const [copied, setCopied] = useState(false);
  const [sortField, setSortField] = useState<keyof Transaction>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');

  // Send form
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMemo, setSendMemo] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [gasEstimate, setGasEstimate] = useState('~0.001 TMZ');

  useEffect(() => {
    refreshBalance();
    fetchTransactions();
  }, []);

  const handleCopyAddress = useCallback(() => {
    if (!address) return;
    window.tamizhi.copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const handleSend = useCallback(async () => {
    if (!sendTo || !sendAmount) return;
    setSendError('');
    setSendSuccess('');
    setIsSending(true);
    try {
      const hash = await sendTokens(sendTo, sendAmount, sendMemo);
      setSendSuccess(`Sent! TX: ${truncate(hash, 10)}`);
      setSendTo('');
      setSendAmount('');
      setSendMemo('');
      setTimeout(() => { refreshBalance(); fetchTransactions(); }, 4000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsSending(false);
    }
  }, [sendTo, sendAmount, sendMemo, sendTokens, refreshBalance, fetchTransactions]);

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedTxs = [...transactions].sort((a, b) => {
    const av = a[sortField] ?? '';
    const bv = b[sortField] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon: React.FC<{ field: keyof Transaction }> = ({ field }) =>
    sortField === field ? (
      <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : (
      <span className="ml-1 opacity-30">↕</span>
    );

  return (
    <div className="flex flex-col h-full bg-navy-950 overflow-auto">
      {/* Balance Card */}
      <div
        className="mx-6 mt-6 rounded-2xl p-6 shadow-xl"
        style={{ background: 'linear-gradient(135deg, #E8500A 0%, #F5C518 100%)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-navy-900/60 text-sm font-medium">Total Balance</p>
            {isLoading ? (
              <Spinner size="md" color="text-navy-900/50" className="mt-2" />
            ) : (
              <p className="text-4xl font-bold text-navy-900 mt-1">{formattedBalance}</p>
            )}
          </div>
          <button
            onClick={() => { refreshBalance(); fetchTransactions(); }}
            className="p-2 rounded-lg bg-navy-900/10 hover:bg-navy-900/20 transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5 text-navy-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        {/* Address */}
        <div className="mt-4 flex items-center gap-2">
          <code className="text-sm text-navy-900/70 font-mono">{truncate(address ?? '', 12)}</code>
          <button
            onClick={handleCopyAddress}
            className="text-navy-900/60 hover:text-navy-900 transition-colors"
            title="Copy address"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Send / Receive panels */}
      <div className="grid grid-cols-2 gap-4 mx-6 mt-6">
        {/* Send Panel */}
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-saffron-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Send TMZ
          </h3>

          <Input
            label="Recipient Address"
            placeholder="cosmos1…"
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
          />
          <Input
            label="Amount (TMZ)"
            placeholder="0.000000"
            type="number"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
          />
          <Input
            label="Memo (optional)"
            placeholder="Payment for…"
            value={sendMemo}
            onChange={(e) => setSendMemo(e.target.value)}
          />

          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Estimated fee</span>
            <span>{gasEstimate}</span>
          </div>

          {sendError && <p className="text-xs text-red-400">{sendError}</p>}
          {sendSuccess && <p className="text-xs text-green-400">{sendSuccess}</p>}

          <Button
            variant="primary"
            fullWidth
            loading={isSending}
            disabled={!sendTo || !sendAmount}
            onClick={handleSend}
          >
            Send
          </Button>
        </div>

        {/* Receive Panel */}
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Receive TMZ
          </h3>

          {/* QR Code placeholder (requires qrcode lib) */}
          <div
            className="w-full aspect-square bg-white rounded-xl flex items-center justify-center max-w-[180px] mx-auto"
            title="QR Code"
          >
            <QRCodeSVG address={address ?? ''} />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-white/40 text-center">Your wallet address</p>
            <div className="bg-navy-900/50 rounded-lg p-3">
              <code className="text-xs font-mono text-white/80 break-all">{address}</code>
            </div>
          </div>

          <Button variant="secondary" fullWidth onClick={handleCopyAddress}>
            {copied ? '✓ Copied' : 'Copy Address'}
          </Button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="mx-6 mt-6 mb-6 bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-semibold">Transaction History</h3>
          <Button variant="ghost" size="sm" onClick={() => exportCSV(transactions)}>
            Export CSV
          </Button>
        </div>

        {sortedTxs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-white/30">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 17H5a2 2 0 00-2 2v1h18v-1a2 2 0 00-2-2h-4" />
              <rect x="9" y="3" width="6" height="14" rx="1" />
            </svg>
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs mt-1">Send or receive TMZ to see history</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-white/40 uppercase tracking-wider border-b border-white/10">
                  {(
                    [
                      ['timestamp', 'Date'],
                      ['type', 'Type'],
                      ['amount', 'Amount'],
                      ['status', 'Status'],
                      ['hash', 'Hash'],
                    ] as [keyof Transaction, string][]
                  ).map(([field, label]) => (
                    <th
                      key={field}
                      className="text-left px-4 py-3 cursor-pointer hover:text-white/60 transition-colors select-none"
                      onClick={() => handleSort(field)}
                    >
                      {label}
                      <SortIcon field={field} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedTxs.map((tx) => (
                  <tr key={tx.hash} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">{formatDate(tx.timestamp)}</td>
                    <td className="px-4 py-3 text-white/80">{tx.type}</td>
                    <td className="px-4 py-3 text-white font-mono">
                      {tx.amount ? `${tx.amount} TMZ` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={tx.status === 'success' ? 'success' : 'error'} dot>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white/60">{truncate(tx.hash, 8)}</span>
                        <button
                          onClick={() => window.tamizhi.copyToClipboard(tx.hash)}
                          className="text-white/30 hover:text-white/60 transition-colors"
                          title="Copy hash"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// MARK: - Simple SVG QR Code (basic placeholder using path patterns)
// In production, integrate with the 'qrcode' npm package

const QRCodeSVG: React.FC<{ address: string }> = ({ address }) => {
  // Generate a simple visual placeholder — real QR needs the qrcode library
  const size = 160;
  const cells = 21;
  const cellSize = size / cells;

  // Use address hash to create deterministic pattern
  const hash = Array.from(address).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0);
  const bits = Array.from({ length: cells * cells }, (_, i) => {
    // Always fill corners (finder patterns)
    const row = Math.floor(i / cells);
    const col = i % cells;
    if ((row < 7 && col < 7) || (row < 7 && col >= cells - 7) || (row >= cells - 7 && col < 7)) {
      return true;
    }
    return ((hash >> (i % 32)) & 1) === 1;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded">
      <rect width={size} height={size} fill="white" />
      {bits.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={(i % cells) * cellSize}
            y={Math.floor(i / cells) * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#0A1628"
          />
        ) : null
      )}
    </svg>
  );
};

export default WalletPage;
