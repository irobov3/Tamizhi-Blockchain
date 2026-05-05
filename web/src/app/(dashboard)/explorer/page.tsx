'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Layers,
  ArrowRightLeft,
  Activity,
  Users,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Code2,
  Hash,
  Blocks,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { StatCardSkeleton, TableSkeleton } from '@/components/explorer/ExplorerSkeletons';
import { Spinner } from '@/components/ui/Spinner';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import {
  getChainStatus,
  getLatestBlock,
  getRecentBlocks,
  getLatestTransactions,
  ExplorerOfflineError,
  type Block,
  type Tx,
  type ChainStatus,
} from '@/lib/explorer-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, n = 12) {
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  labelTamil,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  labelTamil: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-background-card border border-background-border"
    >
      <div className={clsx('inline-flex p-2 rounded-lg mb-3', bg)}>
        <Icon className={clsx('w-4 h-4', color)} />
      </div>
      <div className="text-xl font-bold text-white font-mono">{value}</div>
      <div className="text-text-secondary text-xs mt-0.5">{label}</div>
      <div className="tamil-text text-text-muted text-xs">{labelTamil}</div>
    </motion.div>
  );
}

function BlocksTable({ blocks, loading }: { blocks: Block[]; loading: boolean }) {
  return (
    <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-background-border">
        <div className="flex items-center gap-2">
          <Blocks className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-semibold text-white">Latest Blocks</span>
          <span className="tamil-text text-primary-400 text-xs">சமீபத்திய தொகுதிகள்</span>
        </div>
        <Link
          href="/explorer/blocks"
          className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-background-border/60">
              <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5">Height</th>
              <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5 hidden sm:table-cell">Hash</th>
              <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5 hidden md:table-cell">Proposer</th>
              <th className="text-center text-xs text-text-muted font-medium px-4 py-2.5">Txs</th>
              <th className="text-right text-xs text-text-muted font-medium px-4 py-2.5">Age</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={10} cols={5} />
            ) : blocks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">
                  No blocks found
                </td>
              </tr>
            ) : (
              blocks.map((block, i) => {
                const h = Number(block.block.header.height);
                const hash = block.block_id.hash;
                const proposer = block.block.header.proposer_address;
                const txCount = block.block.data.txs?.length ?? 0;
                const time = block.block.header.time;
                return (
                  <motion.tr
                    key={h}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-background-border/40 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/explorer/blocks/${h}`}
                        className="text-primary-400 hover:text-primary-300 font-mono text-sm font-semibold transition-colors"
                      >
                        #{h.toLocaleString()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-text-secondary font-mono text-xs">
                        {truncate(hash, 12)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-text-secondary font-mono text-xs">
                        {truncate(proposer, 14)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={txCount > 0 ? 'primary' : 'default'} size="xs">
                        {txCount}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-text-muted text-xs flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(time), { addSuffix: true })}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TxsTable({ txs, loading }: { txs: Tx[]; loading: boolean }) {
  return (
    <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-background-border">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-semibold text-white">Latest Transactions</span>
          <span className="tamil-text text-primary-400 text-xs">சமீபத்திய பரிவர்த்தனைகள்</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-background-border/60">
              <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5">Tx Hash</th>
              <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5 hidden sm:table-cell">Type</th>
              <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5 hidden md:table-cell">Height</th>
              <th className="text-center text-xs text-text-muted font-medium px-4 py-2.5">Status</th>
              <th className="text-right text-xs text-text-muted font-medium px-4 py-2.5">Age</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={10} cols={5} />
            ) : txs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">
                  No transactions found
                </td>
              </tr>
            ) : (
              txs.slice(0, 10).map((tx, i) => (
                <motion.tr
                  key={tx.hash}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-background-border/40 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/explorer/txs/${tx.hash}`}
                      className="text-primary-400 hover:text-primary-300 font-mono text-xs transition-colors"
                    >
                      {truncate(tx.hash, 16)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="secondary" size="xs">
                      {msgType(tx)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Link
                      href={`/explorer/blocks/${tx.height}`}
                      className="text-text-secondary font-mono text-xs hover:text-primary-400 transition-colors"
                    >
                      #{Number(tx.height).toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.tx_result.code === 0 ? (
                      <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-text-muted text-xs">
                      {/* Height-based age approximation; use block time if available */}
                      Block #{Number(tx.height).toLocaleString()}
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExplorerPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Chain status — refetch every 10 s
  const statusQuery = useQuery<ChainStatus, Error>({
    queryKey: ['explorer', 'chainStatus'],
    queryFn: getChainStatus,
    refetchInterval: 10_000,
    retry: false,
  });

  // Latest blocks
  const blocksQuery = useQuery<Block[], Error>({
    queryKey: ['explorer', 'recentBlocks'],
    queryFn: async () => {
      const latest = await getLatestBlock();
      const h = Number(latest.block.header.height);
      return getRecentBlocks(h, 10);
    },
    refetchInterval: 10_000,
    retry: false,
  });

  // Latest txs
  const txsQuery = useQuery<Tx[], Error>({
    queryKey: ['explorer', 'latestTxs'],
    queryFn: () => getLatestTransactions(10),
    refetchInterval: 10_000,
    retry: false,
  });

  const isOffline =
    statusQuery.error instanceof ExplorerOfflineError ||
    blocksQuery.error instanceof ExplorerOfflineError;

  const status = statusQuery.data;
  const blocks = blocksQuery.data ?? [];
  const txs = txsQuery.data ?? [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    // Route based on query shape
    if (/^\d+$/.test(q)) {
      router.push(`/explorer/blocks/${q}`);
    } else if (q.length >= 40 && !q.startsWith('tamizhi1')) {
      router.push(`/explorer/txs/${q.toUpperCase()}`);
    } else if (q.startsWith('tamizhi1')) {
      // address — future: account page
      router.push(`/explorer/txs/${q}`);
    } else {
      router.push(`/explorer/blocks/${q}`);
    }
    setSearching(false);
  };

  const quickLinks = [
    { href: '/explorer/blocks', label: 'Blocks', labelTamil: 'தொகுதிகள்', icon: Blocks },
    { href: '/explorer/validators', label: 'Validators', labelTamil: 'சரிபார்ப்பாளர்கள்', icon: Users },
    { href: '/explorer/contracts', label: 'Contracts', labelTamil: 'ஒப்பந்தங்கள்', icon: Code2 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary-400" />
          Block Explorer
        </h1>
        <p className="tamil-text text-primary-400 text-sm mt-0.5">தொகுதி ஆய்வாளர்</p>
      </div>

      {/* Offline banner */}
      {isOffline && (
        <ChainOfflineBanner
          onRetry={() => {
            statusQuery.refetch();
            blocksQuery.refetch();
            txsQuery.refetch();
          }}
        />
      )}

      {/* Search */}
      <form onSubmit={handleSearch}>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by block height, tx hash, or address…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
          >
            {searching ? <Spinner size="sm" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        {quickLinks.map(({ href, label, labelTamil, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background-card border border-background-border hover:border-primary-500/30 hover:bg-surface-hover text-text-secondary hover:text-white transition-all text-sm"
          >
            <Icon className="w-4 h-4 text-primary-400" />
            <span>{label}</span>
            <span className="tamil-text text-primary-400 text-xs">{labelTamil}</span>
            <ChevronRight className="w-3 h-3 text-text-muted" />
          </Link>
        ))}
      </div>

      {/* Chain stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Block Height"
              labelTamil="தொகுதி உயரம்"
              value={status ? Number(status.latestHeight).toLocaleString() : '—'}
              icon={Layers}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              label="Bonded Tokens"
              labelTamil="பிணைக்கப்பட்டவை"
              value={
                status
                  ? `${(Number(status.bondedTokens) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 0 })} TMZ`
                  : '—'
              }
              icon={Database}
              color="text-purple-400"
              bg="bg-purple-500/10"
            />
            <StatCard
              label="Chain ID"
              labelTamil="சங்கிலி ID"
              value={status?.chainId ?? '—'}
              icon={Hash}
              color="text-yellow-400"
              bg="bg-yellow-500/10"
            />
            <StatCard
              label="Latest Block"
              labelTamil="புதிய தொகுதி"
              value={
                status
                  ? formatDistanceToNow(new Date(status.latestTime), { addSuffix: true })
                  : '—'
              }
              icon={Clock}
              color="text-green-400"
              bg="bg-green-500/10"
            />
          </>
        )}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BlocksTable
          blocks={blocks}
          loading={blocksQuery.isLoading}
        />
        <TxsTable
          txs={txs}
          loading={txsQuery.isLoading}
        />
      </div>
    </div>
  );
}
