'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Wallet,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { DetailSkeleton, TableSkeleton } from '@/components/explorer/ExplorerSkeletons';
import {
  getAddress,
  getTransactionsList,
  ExplorerOfflineError,
  timeAgo,
  truncateHash,
  formatTMZ,
  type AddressInfo,
  type Tx,
} from '@/lib/explorer-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-cyan-400 transition-colors"
      title="Copy address"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function DetailRow({
  label,
  labelTamil,
  children,
}: {
  label: string;
  labelTamil?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-[#2a1f5c]/50 last:border-0">
      <div className="sm:w-40 flex-shrink-0">
        <span className="text-gray-400 text-sm">{label}</span>
        {labelTamil && (
          <span className="tamil-text text-gray-500 text-xs block">{labelTamil}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function makeMockAddress(address: string): AddressInfo {
  return {
    address,
    balance: '1500000000',
    tx_count: 42,
  };
}

const MOCK_TXS: Tx[] = Array.from({ length: 5 }, (_, i) => ({
  hash: `TXMOCK${(0xABCDEF + i).toString(16).toUpperCase()}`,
  height: 142000 + i * 100,
  index: i,
  sender: 'tamizhi1mockaddress001',
  msg_types: ['MsgSend'],
  code: 0,
  gas_used: 50000,
  gas_wanted: 80000,
  fee_amount: '500',
  fee_denom: 'utmz',
  memo: '',
  time: new Date(Date.now() - i * 60000 * 10).toISOString(),
}));

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AddressPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);

  const [info, setInfo] = useState<AddressInfo | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch address info and recent txs in parallel
      const [addrInfo, txData] = await Promise.all([
        getAddress(address),
        getTransactionsList(20, 0),
      ]);
      setInfo(addrInfo);
      // Filter txs for this address (sender match)
      const filtered = txData.txs.filter((t) => t.sender === address);
      setTxs(filtered.length > 0 ? filtered : txData.txs.slice(0, 10));
      setIsOffline(false);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ExplorerOfflineError) {
        setIsOffline(true);
        setInfo(makeMockAddress(address));
        setTxs(MOCK_TXS);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/explorer"
          className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-cyan-400" />
            Account
          </h1>
          <p className="tamil-text text-cyan-400 text-xs">கணக்கு விவரங்கள்</p>
        </div>
      </div>

      {isOffline && <ChainOfflineBanner onRetry={fetchData} />}

      {loading ? (
        <DetailSkeleton />
      ) : notFound ? (
        <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] p-8 text-center text-gray-500">
          Address not found
          <p className="text-xs mt-1 font-mono break-all">{address}</p>
        </div>
      ) : info ? (
        <div className="space-y-6">
          {/* Address display */}
          <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a1f5c]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-400" />
                Address Info
                <span className="tamil-text text-cyan-400 text-xs font-normal">முகவரி தகவல்</span>
              </h2>
            </div>
            <div className="px-5">
              <DetailRow label="Address" labelTamil="முகவரி">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-300 break-all">{info.address}</span>
                  <CopyButton text={info.address} />
                </div>
              </DetailRow>

              <DetailRow label="Balance" labelTamil="இருப்பு">
                <span className="font-mono text-lg font-bold text-cyan-400">
                  {formatTMZ(info.balance)}
                </span>
                <span className="text-gray-500 text-xs ml-2">
                  ({Number(info.balance).toLocaleString()} utmz)
                </span>
              </DetailRow>

              {info.tx_count !== undefined && (
                <DetailRow label="Transactions" labelTamil="பரிவர்த்தனைகள்">
                  <span className="font-mono text-gray-300">
                    {info.tx_count.toLocaleString()}
                  </span>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Balance card (visual) */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#1a1040] to-[#0e1a40] border border-cyan-400/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">TMZ Balance</p>
                <p className="text-3xl font-bold text-white font-mono">
                  {formatTMZ(info.balance)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Transaction history */}
          <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a1f5c]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                Transaction History
                <span className="tamil-text text-cyan-400 text-xs font-normal">பரிவர்த்தனை வரலாறு</span>
              </h2>
            </div>

            {txs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No transactions found for this address
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a1f5c]/60">
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5">Tx Hash</th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5 hidden sm:table-cell">
                        Block
                      </th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5 hidden md:table-cell">
                        Type
                      </th>
                      <th className="text-center text-xs text-gray-500 font-medium px-4 py-2.5">Status</th>
                      <th className="text-right text-xs text-gray-500 font-medium px-4 py-2.5">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx) => (
                      <tr
                        key={tx.hash}
                        className="border-b border-[#2a1f5c]/40 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/explorer/txs/${tx.hash}`}
                            className="text-cyan-400 hover:text-cyan-300 font-mono text-xs transition-colors"
                          >
                            {truncateHash(tx.hash, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {tx.height ? (
                            <Link
                              href={`/explorer/blocks/${tx.height}`}
                              className="text-gray-400 font-mono text-xs hover:text-cyan-400 transition-colors"
                            >
                              #{Number(tx.height).toLocaleString()}
                            </Link>
                          ) : (
                            <span className="text-gray-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 font-mono">
                            {(tx.msg_types[0] ?? 'unknown').replace('Msg', '')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.code === 0 ? (
                            <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-500 text-xs flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            {tx.time ? timeAgo(tx.time) : `Block #${tx.height}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
