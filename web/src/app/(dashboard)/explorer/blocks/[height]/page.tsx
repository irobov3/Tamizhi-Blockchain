'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
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
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { DetailSkeleton } from '@/components/explorer/ExplorerSkeletons';
import { format } from 'date-fns';
import {
  getBlock,
  getBlockTransactions,
  ExplorerOfflineError,
  type Block,
  type Tx,
} from '@/lib/explorer-api';

function truncate(s: string, n = 20) {
  if (!s) return '—';
  return s.length <= n ? s : `${s.slice(0, n)}...`;
}

function msgType(tx: Tx): string {
  const msgs = tx.tx?.body?.messages ?? [];
  if (msgs.length === 0) return 'unknown';
  const t = msgs[0]['@type'] ?? '';
  const parts = t.split('.');
  return parts[parts.length - 1]?.replace('Msg', '') ?? t;
}

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
      className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-primary-400 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function DetailRow({ label, labelTamil, children }: { label: string; labelTamil?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-background-border/50 last:border-0">
      <div className="sm:w-44 flex-shrink-0">
        <span className="text-text-muted text-sm">{label}</span>
        {labelTamil && <span className="tamil-text text-text-muted text-xs block">{labelTamil}</span>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function BlockDetailPage({
  params,
}: {
  params: Promise<{ height: string }>;
}) {
  const { height: heightStr } = use(params);
  const height = Number(heightStr);

  const blockQuery = useQuery<Block, Error>({
    queryKey: ['explorer', 'block', height],
    queryFn: () => getBlock(height),
    retry: false,
    staleTime: 60_000,
  });

  const txsQuery = useQuery<Tx[], Error>({
    queryKey: ['explorer', 'blockTxs', height],
    queryFn: () => getBlockTransactions(height),
    retry: false,
    staleTime: 60_000,
  });

  const isOffline =
    blockQuery.error instanceof ExplorerOfflineError ||
    txsQuery.error instanceof ExplorerOfflineError;

  const block = blockQuery.data;
  const txs = txsQuery.data ?? [];
  const header = block?.block.header;
  const blockHash = block?.block_id.hash ?? '';
  const txCount = block?.block.data.txs?.length ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/explorer/blocks"
          className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-400" />
            Block #{height.toLocaleString()}
          </h1>
          <p className="tamil-text text-primary-400 text-xs">தொகுதி விவரங்கள்</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/explorer/blocks/${height - 1}`}
            className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-white transition-colors"
            title="Previous block"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link
            href={`/explorer/blocks/${height + 1}`}
            className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-white transition-colors"
            title="Next block"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {isOffline && <ChainOfflineBanner onRetry={() => { blockQuery.refetch(); txsQuery.refetch(); }} />}

      {blockQuery.isLoading ? (
        <DetailSkeleton />
      ) : blockQuery.error && !isOffline ? (
        <div className="rounded-xl bg-background-card border border-background-border p-8 text-center text-text-muted">
          Block #{height.toLocaleString()} not found
        </div>
      ) : header ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Block header details */}
          <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
            <div className="px-5 py-4 border-b border-background-border">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary-400" />
                Block Header
                <span className="tamil-text text-primary-400 text-xs font-normal">தலைப்பு</span>
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
                  <span className="font-mono text-xs text-text-primary break-all">{blockHash}</span>
                  {blockHash && <CopyButton text={blockHash} />}
                </div>
              </DetailRow>

              <DetailRow label="Time" labelTamil="நேரம்">
                <div className="flex items-center gap-2 text-text-primary text-sm">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  {header.time
                    ? format(new Date(header.time), 'PPpp')
                    : '—'}
                </div>
              </DetailRow>

              <DetailRow label="Chain ID" labelTamil="சங்கிலி ID">
                <Badge variant="secondary" size="sm">{header.chain_id}</Badge>
              </DetailRow>

              <DetailRow label="Proposer" labelTamil="முன்மொழிவாளர்">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-text-muted" />
                  <span className="font-mono text-xs text-text-primary break-all">
                    {header.proposer_address || '—'}
                  </span>
                  {header.proposer_address && (
                    <CopyButton text={header.proposer_address} />
                  )}
                </div>
              </DetailRow>

              <DetailRow label="App Hash" labelTamil="பயன்பாடு ஹாஷ்">
                <span className="font-mono text-xs text-text-secondary break-all">
                  {header.app_hash || '—'}
                </span>
              </DetailRow>

              <DetailRow label="Transactions" labelTamil="பரிவர்த்தனைகள்">
                <Badge variant={txCount > 0 ? 'primary' : 'default'}>
                  {txCount} tx{txCount !== 1 ? 's' : ''}
                </Badge>
              </DetailRow>
            </div>
          </div>

          {/* Transactions in this block */}
          <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
            <div className="px-5 py-4 border-b border-background-border">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary-400" />
                Transactions
                <span className="tamil-text text-primary-400 text-xs font-normal">பரிவர்த்தனைகள்</span>
                <Badge variant="default" size="xs" className="ml-1">{txs.length}</Badge>
              </h2>
            </div>

            {txsQuery.isLoading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : txs.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">
                No transactions in this block
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-background-border/60">
                      <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5">Tx Hash</th>
                      <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5 hidden sm:table-cell">Type</th>
                      <th className="text-right text-xs text-text-muted font-medium px-4 py-2.5 hidden md:table-cell">Gas Used</th>
                      <th className="text-center text-xs text-text-muted font-medium px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx, i) => (
                      <motion.tr
                        key={tx.hash}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-background-border/40 hover:bg-surface-hover transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/explorer/txs/${tx.hash}`}
                            className="text-primary-400 hover:text-primary-300 font-mono text-xs transition-colors"
                          >
                            {truncate(tx.hash, 20)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant="secondary" size="xs">{msgType(tx)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <span className="text-text-secondary font-mono text-xs">
                            {Number(tx.tx_result.gas_used).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.tx_result.code === 0 ? (
                            <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
