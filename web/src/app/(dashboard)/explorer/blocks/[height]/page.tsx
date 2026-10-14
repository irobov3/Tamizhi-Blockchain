'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Hash,
  Clock,
  Layers,
  User,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { DetailSkeleton } from '@/components/explorer/ExplorerSkeletons';
import {
  getBlockByHeight,
  ExplorerOfflineError,
  timeAgo,
  truncateHash,
  type BlockDetail,
  type Tx,
} from '@/lib/explorer-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-cyan-400 transition-colors"
      title="Copy"
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
      <div className="sm:w-44 flex-shrink-0">
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

function makeMockBlock(height: number): BlockDetail {
  return {
    height,
    hash: 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2',
    time: new Date(Date.now() - 60000).toISOString(),
    proposer: 'tamizhi1valoper1abcdef123456789xyz',
    tx_count: 3,
    transactions: [
      {
        hash: 'TXABC123DEF456789',
        height,
        index: 0,
        sender: 'tamizhi1sender001abc',
        msg_types: ['MsgSend'],
        code: 0,
        gas_used: 52000,
        gas_wanted: 80000,
        fee_amount: '500',
        fee_denom: 'utmz',
        memo: 'Demo tx',
        time: new Date(Date.now() - 55000).toISOString(),
      },
    ],
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BlockDetailPage({
  params,
}: {
  params: Promise<{ height: string }>;
}) {
  const { height: heightStr } = use(params);
  const height = Number(heightStr);

  const [block, setBlock] = useState<BlockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchBlock = async () => {
    setLoading(true);
    try {
      const b = await getBlockByHeight(height);
      setBlock(b);
      setIsOffline(false);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ExplorerOfflineError) {
        setIsOffline(true);
        setBlock(makeMockBlock(height));
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  const txs: Tx[] = block?.transactions ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/explorer/blocks"
          className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Block #{height.toLocaleString()}
          </h1>
          <p className="tamil-text text-cyan-400 text-xs">தொகுதி விவரங்கள்</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/explorer/blocks/${height - 1}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1a1040] border border-[#2a1f5c] hover:border-cyan-400/30 text-gray-400 hover:text-white transition-all text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </Link>
          <Link
            href={`/explorer/blocks/${height + 1}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1a1040] border border-[#2a1f5c] hover:border-cyan-400/30 text-gray-400 hover:text-white transition-all text-xs"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {isOffline && (
        <ChainOfflineBanner
          onRetry={() => {
            fetchBlock();
          }}
        />
      )}

      {loading ? (
        <DetailSkeleton />
      ) : notFound ? (
        <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] p-8 text-center text-gray-500">
          Block #{height.toLocaleString()} not found
        </div>
      ) : block ? (
        <div className="space-y-6">
          {/* Block info card */}
          <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a1f5c]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-cyan-400" />
                Block Info
                <span className="tamil-text text-cyan-400 text-xs font-normal">தொகுதி தகவல்</span>
              </h2>
            </div>
            <div className="px-5">
              <DetailRow label="Height" labelTamil="உயரம்">
                <span className="font-mono text-white font-semibold">
                  #{height.toLocaleString()}
                </span>
              </DetailRow>

              <DetailRow label="Block Hash" labelTamil="தொகுதி ஹாஷ்">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-300 break-all">{block.hash}</span>
                  {block.hash && <CopyButton text={block.hash} />}
                </div>
              </DetailRow>

              <DetailRow label="Time" labelTamil="நேரம்">
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  {new Date(block.time).toLocaleString()} ({timeAgo(block.time)})
                </div>
              </DetailRow>

              <DetailRow label="Proposer" labelTamil="முன்மொழிவாளர்">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span className="font-mono text-xs text-gray-300 break-all">
                    {block.proposer || '—'}
                  </span>
                  {block.proposer && <CopyButton text={block.proposer} />}
                </div>
              </DetailRow>

              <DetailRow label="Transactions" labelTamil="பரிவர்த்தனைகள்">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    block.tx_count > 0
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-gray-700/50 text-gray-500'
                  }`}
                >
                  {block.tx_count} tx{block.tx_count !== 1 ? 's' : ''}
                </span>
              </DetailRow>
            </div>
          </div>

          {/* Transactions table */}
          <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a1f5c]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                Transactions
                <span className="tamil-text text-cyan-400 text-xs font-normal">பரிவர்த்தனைகள்</span>
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-700/50 text-gray-400 font-mono">
                  {txs.length}
                </span>
              </h2>
            </div>

            {txs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No transactions in this block
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a1f5c]/60">
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5">Tx Hash</th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5 hidden sm:table-cell">From</th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5 hidden md:table-cell">Type</th>
                      <th className="text-right text-xs text-gray-500 font-medium px-4 py-2.5 hidden lg:table-cell">Fee</th>
                      <th className="text-center text-xs text-gray-500 font-medium px-4 py-2.5">Status</th>
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
                          <span className="text-gray-400 font-mono text-xs">
                            {tx.sender ? `${tx.sender.slice(0, 14)}...` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 font-mono">
                            {(tx.msg_types[0] ?? 'unknown').replace('Msg', '')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="font-mono text-xs text-gray-400">
                            {(Number(tx.fee_amount) / 1_000_000).toFixed(4)} TMZ
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.code === 0 ? (
                            <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                          )}
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
