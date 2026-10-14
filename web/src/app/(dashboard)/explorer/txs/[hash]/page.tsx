'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
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
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { DetailSkeleton } from '@/components/explorer/ExplorerSkeletons';
import {
  getTransactionByHash,
  ExplorerOfflineError,
  timeAgo,
  type TxDetail,
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

function CollapsibleRawLog({ log }: { log: string }) {
  const [expanded, setExpanded] = useState(false);
  const formatted = (() => {
    try {
      return JSON.stringify(JSON.parse(log), null, 2);
    } catch {
      return log;
    }
  })();
  return (
    <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          Raw Log
          <span className="tamil-text text-cyan-400 text-xs font-normal">பதிவு</span>
        </h2>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-[#2a1f5c] p-4">
          <pre className="text-xs text-gray-400 font-mono overflow-x-auto bg-[#0e0824] rounded-lg p-3 whitespace-pre-wrap break-all">
            {formatted}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function makeMockTx(hash: string): TxDetail {
  return {
    hash,
    height: 142800,
    index: 0,
    sender: 'tamizhi1sender001abcdef',
    msg_types: ['MsgSend'],
    code: 0,
    gas_used: 52000,
    gas_wanted: 80000,
    fee_amount: '500',
    fee_denom: 'utmz',
    memo: 'Demo transaction',
    time: new Date(Date.now() - 300000).toISOString(),
    raw_log: '[]',
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TxDetailPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = use(params);

  const [tx, setTx] = useState<TxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchTx = async () => {
    setLoading(true);
    try {
      const t = await getTransactionByHash(hash);
      setTx(t);
      setIsOffline(false);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ExplorerOfflineError) {
        setIsOffline(true);
        setTx(makeMockTx(hash));
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const success = tx?.code === 0;

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
            <Hash className="w-5 h-5 text-cyan-400" />
            Transaction
          </h1>
          <p className="tamil-text text-cyan-400 text-xs">பரிவர்த்தனை விவரங்கள்</p>
        </div>
      </div>

      {isOffline && <ChainOfflineBanner onRetry={fetchTx} />}

      {loading ? (
        <DetailSkeleton />
      ) : notFound ? (
        <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] p-8 text-center text-gray-500">
          Transaction not found
          <p className="text-xs mt-1 font-mono break-all">{hash}</p>
        </div>
      ) : tx ? (
        <div className="space-y-6">
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
              <p className="tamil-text text-xs text-gray-500">
                {success ? 'பரிவர்த்தனை வெற்றிகரமானது' : 'பரிவர்த்தனை தோல்வியடைந்தது'}
              </p>
            </div>
            {!success && (
              <span className="ml-auto text-xs text-red-400 font-mono">
                Code: {tx.code}
              </span>
            )}
          </div>

          {/* Core details */}
          <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a1f5c]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Overview
                <span className="tamil-text text-cyan-400 text-xs font-normal">கண்ணோட்டம்</span>
              </h2>
            </div>
            <div className="px-5">
              <DetailRow label="Tx Hash" labelTamil="ஹாஷ்">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-300 break-all">{tx.hash}</span>
                  <CopyButton text={tx.hash} />
                </div>
              </DetailRow>

              <DetailRow label="Block Height" labelTamil="தொகுதி உயரம்">
                <Link
                  href={`/explorer/blocks/${tx.height}`}
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm font-semibold transition-colors"
                >
                  #{Number(tx.height).toLocaleString()}
                </Link>
              </DetailRow>

              <DetailRow label="Status" labelTamil="நிலை">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    success
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {success ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {success ? 'Success' : 'Failed'}
                </span>
              </DetailRow>

              {tx.time && (
                <DetailRow label="Time" labelTamil="நேரம்">
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    {new Date(tx.time).toLocaleString()} ({timeAgo(tx.time)})
                  </div>
                </DetailRow>
              )}

              {/* Message types as badges */}
              {tx.msg_types.length > 0 && (
                <DetailRow label="Message Types" labelTamil="செய்தி வகைகள்">
                  <div className="flex flex-wrap gap-2">
                    {tx.msg_types.map((t, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 font-mono"
                      >
                        {t.replace('Msg', '')}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}

              {/* From address */}
              {tx.sender && (
                <DetailRow label="From" labelTamil="அனுப்புபவர்">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/explorer/address/${tx.sender}`}
                      className="font-mono text-xs text-cyan-400 hover:text-cyan-300 break-all transition-colors"
                    >
                      {tx.sender}
                    </Link>
                    <CopyButton text={tx.sender} />
                  </div>
                </DetailRow>
              )}

              {/* Fee */}
              <DetailRow label="Fee" labelTamil="கட்டணம்">
                <span className="font-mono text-sm text-gray-300">
                  {(Number(tx.fee_amount) / 1_000_000).toFixed(6)}{' '}
                  {tx.fee_denom.replace('u', '').toUpperCase()}
                </span>
              </DetailRow>

              {/* Gas */}
              <DetailRow label="Gas Used / Wanted" labelTamil="வாயு பயன்பாடு">
                <div className="flex items-center gap-2">
                  <Fuel className="w-3.5 h-3.5 text-gray-500" />
                  <span className="font-mono text-sm text-gray-300">
                    {tx.gas_used.toLocaleString()} / {tx.gas_wanted.toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-xs">
                    ({Math.round((tx.gas_used / Math.max(1, tx.gas_wanted)) * 100)}%)
                  </span>
                </div>
              </DetailRow>

              {/* Memo */}
              {tx.memo && (
                <DetailRow label="Memo" labelTamil="குறிப்பு">
                  <span className="text-gray-300 text-sm">{tx.memo}</span>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Raw log (collapsible) */}
          {tx.raw_log && <CollapsibleRawLog log={tx.raw_log} />}
        </div>
      ) : null}
    </div>
  );
}
