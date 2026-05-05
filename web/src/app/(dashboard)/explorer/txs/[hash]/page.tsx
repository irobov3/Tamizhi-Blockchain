'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  Fuel,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { DetailSkeleton } from '@/components/explorer/ExplorerSkeletons';
import { format } from 'date-fns';
import {
  getTransaction,
  ExplorerOfflineError,
  type Tx,
} from '@/lib/explorer-api';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-primary-400 transition-colors"
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
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-background-border/50 last:border-0">
      <div className="sm:w-44 flex-shrink-0">
        <span className="text-text-muted text-sm">{label}</span>
        {labelTamil && (
          <span className="tamil-text text-text-muted text-xs block">{labelTamil}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function MsgCard({ msg, index }: { msg: Record<string, unknown>; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const type = (msg['@type'] as string) ?? 'unknown';
  const parts = type.split('.');
  const shortType = parts[parts.length - 1]?.replace('Msg', '') ?? type;

  return (
    <div className="rounded-xl border border-background-border bg-surface-DEFAULT overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant="secondary" size="sm">{index + 1}</Badge>
          <span className="text-text-primary text-sm font-medium">{shortType}</span>
          <span className="text-text-muted text-xs font-mono hidden sm:inline">{type}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-background-border/50">
          <pre className="text-xs text-text-secondary font-mono overflow-x-auto bg-background-DEFAULT rounded-lg p-3 mt-3">
            {JSON.stringify(msg, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function TxDetailPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = use(params);

  const txQuery = useQuery<Tx, Error>({
    queryKey: ['explorer', 'tx', hash],
    queryFn: () => getTransaction(hash),
    retry: false,
    staleTime: 60_000,
  });

  const isOffline = txQuery.error instanceof ExplorerOfflineError;
  const tx = txQuery.data;
  const success = tx?.tx_result.code === 0;
  const messages: Array<Record<string, unknown>> =
    (tx?.tx?.body?.messages as Array<Record<string, unknown>>) ?? [];
  const fee = tx?.tx?.auth_info?.fee?.amount ?? [];
  const memo = tx?.tx?.body?.memo ?? '';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/explorer"
          className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary-400" />
            Transaction
          </h1>
          <p className="tamil-text text-primary-400 text-xs">பரிவர்த்தனை விவரங்கள்</p>
        </div>
      </div>

      {isOffline && <ChainOfflineBanner onRetry={() => txQuery.refetch()} />}

      {txQuery.isLoading ? (
        <DetailSkeleton />
      ) : txQuery.error && !isOffline ? (
        <div className="rounded-xl bg-background-card border border-background-border p-8 text-center text-text-muted">
          Transaction not found
          <p className="text-xs mt-1 font-mono">{hash}</p>
        </div>
      ) : tx ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Status banner */}
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${
              success
                ? 'bg-green-500/10 border-green-500/25'
                : 'bg-red-500/10 border-red-500/25'
            }`}
          >
            {success ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <div>
              <p className={`font-semibold ${success ? 'text-green-400' : 'text-red-400'}`}>
                {success ? 'Transaction Successful' : 'Transaction Failed'}
              </p>
              <p className="tamil-text text-xs text-text-muted">
                {success ? 'பரிவர்த்தனை வெற்றிகரமானது' : 'பரிவர்த்தனை தோல்வியடைந்தது'}
              </p>
            </div>
            {!success && (
              <span className="ml-auto text-xs text-red-400 font-mono">
                Code: {tx.tx_result.code}
              </span>
            )}
          </div>

          {/* Core details */}
          <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
            <div className="px-5 py-4 border-b border-background-border">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-400" />
                Overview
                <span className="tamil-text text-primary-400 text-xs font-normal">கண்ணோட்டம்</span>
              </h2>
            </div>
            <div className="px-5">
              <DetailRow label="Tx Hash" labelTamil="ஹாஷ்">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-text-primary break-all">{tx.hash}</span>
                  <CopyButton text={tx.hash} />
                </div>
              </DetailRow>

              <DetailRow label="Block Height" labelTamil="தொகுதி உயரம்">
                <Link
                  href={`/explorer/blocks/${tx.height}`}
                  className="text-primary-400 hover:text-primary-300 font-mono text-sm font-semibold transition-colors"
                >
                  #{Number(tx.height).toLocaleString()}
                </Link>
              </DetailRow>

              <DetailRow label="Status" labelTamil="நிலை">
                <Badge variant={success ? 'success' : 'error'}>
                  {success ? 'Success' : 'Failed'}
                </Badge>
              </DetailRow>

              <DetailRow label="Gas Used / Wanted" labelTamil="வாயு பயன்பாடு">
                <div className="flex items-center gap-2">
                  <Fuel className="w-3.5 h-3.5 text-text-muted" />
                  <span className="font-mono text-sm text-text-primary">
                    {Number(tx.tx_result.gas_used).toLocaleString()}
                    {' / '}
                    {Number(tx.tx_result.gas_wanted).toLocaleString()}
                  </span>
                  <span className="text-text-muted text-xs">
                    ({Math.round((Number(tx.tx_result.gas_used) / Math.max(1, Number(tx.tx_result.gas_wanted))) * 100)}%)
                  </span>
                </div>
              </DetailRow>

              {fee.length > 0 && (
                <DetailRow label="Fee" labelTamil="கட்டணம்">
                  <span className="font-mono text-sm text-text-primary">
                    {fee
                      .map(
                        (f) =>
                          `${(Number(f.amount) / 1_000_000).toFixed(6)} ${f.denom.replace('u', '').toUpperCase()}`
                      )
                      .join(', ')}
                  </span>
                </DetailRow>
              )}

              {memo && (
                <DetailRow label="Memo" labelTamil="குறிப்பு">
                  <span className="text-text-secondary text-sm">{memo}</span>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Messages */}
          {messages.length > 0 && (
            <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
              <div className="px-5 py-4 border-b border-background-border">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-400" />
                  Messages
                  <span className="tamil-text text-primary-400 text-xs font-normal">செய்திகள்</span>
                  <Badge variant="default" size="xs" className="ml-1">{messages.length}</Badge>
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {messages.map((msg, i) => (
                  <MsgCard key={i} msg={msg} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Raw log */}
          {tx.tx_result.log && (
            <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
              <div className="px-5 py-4 border-b border-background-border">
                <h2 className="text-sm font-semibold text-white">
                  Raw Log
                  <span className="tamil-text text-primary-400 text-xs font-normal ml-2">பதிவு</span>
                </h2>
              </div>
              <div className="p-4">
                <pre className="text-xs text-text-secondary font-mono overflow-x-auto bg-background-DEFAULT rounded-lg p-3 whitespace-pre-wrap break-all">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(tx.tx_result.log), null, 2);
                    } catch {
                      return tx.tx_result.log;
                    }
                  })()}
                </pre>
              </div>
            </div>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
