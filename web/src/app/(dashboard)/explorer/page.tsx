'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Layers,
  ArrowRightLeft,
  Activity,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Blocks,
  RefreshCw,
} from 'lucide-react';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { StatCardSkeleton, TableSkeleton } from '@/components/explorer/ExplorerSkeletons';
import {
  getStats,
  getBlocks,
  getTransactionsList,
  ExplorerOfflineError,
  timeAgo,
  truncateHash,
  type ChainStats,
  type Block,
  type Tx,
} from '@/lib/explorer-api';

// ─── Mock data for offline display ────────────────────────────────────────────

const MOCK_STATS: ChainStats = {
  total_blocks: 142857,
  total_transactions: 31415,
  total_nodes: 12,
  total_literature_works: 108,
  latest_block: { height: 142857, hash: 'A1B2C3D4E5F6...', time: new Date().toISOString() },
};

const MOCK_BLOCKS: Block[] = Array.from({ length: 10 }, (_, i) => ({
  height: 142857 - i,
  hash: `${(0xA1B2C3D4E5F6 - i * 0x1000).toString(16).toUpperCase().padStart(12, '0')}...`,
  time: new Date(Date.now() - i * 6000).toISOString(),
  proposer: `tamizhi1val${(i + 1).toString().padStart(3, '0')}...`,
  tx_count: Math.floor(Math.random() * 5),
}));

const MOCK_TXS: Tx[] = Array.from({ length: 10 }, (_, i) => ({
  hash: `TX${(0xDEADBEEF + i).toString(16).toUpperCase()}...`,
  height: 142857 - i,
  index: i,
  sender: `tamizhi1addr${(i + 1).toString().padStart(3, '0')}...`,
  msg_types: ['MsgSend', 'MsgDelegate', 'MsgVote'][i % 3] ? ['MsgSend'] : ['MsgDelegate'],
  code: i % 7 === 0 ? 1 : 0,
  gas_used: 50000 + i * 1000,
  gas_wanted: 80000,
  fee_amount: '500',
  fee_denom: 'utmz',
  memo: '',
  time: new Date(Date.now() - i * 8000).toISOString(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, n = 12) {
  if (!s) return '—';
  return s.length <= n ? s : `${s.slice(0, n)}...`;
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
    <div className="p-4 rounded-xl bg-[#1a1040] border border-[#2a1f5c]">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-xl font-bold text-white font-mono">{value}</div>
      <div className="text-gray-400 text-xs mt-0.5">{label}</div>
      <div className="tamil-text text-gray-500 text-xs">{labelTamil}</div>
    </div>
  );
}

function LatestBlockCard({ block }: { block: ChainStats['latest_block'] }) {
  if (!block) return null;
  return (
    <div className="p-5 rounded-xl bg-gradient-to-r from-[#1a1040] to-[#0e1a40] border border-cyan-400/30 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
          Latest Block
        </div>
        <Link
          href={`/explorer/blocks/${block.height}`}
          className="text-2xl font-bold text-white font-mono hover:text-cyan-400 transition-colors"
        >
          #{block.height.toLocaleString()}
        </Link>
        <div className="font-mono text-xs text-gray-400 mt-1 truncate">
          {truncate(block.hash, 24)}
        </div>
      </div>
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Clock className="w-4 h-4 text-cyan-400" />
        {timeAgo(block.time)}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExplorerPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [s, b, t] = await Promise.all([
        getStats(),
        getBlocks(10, 0),
        getTransactionsList(10, 0),
      ]);
      setStats(s);
      setBlocks(b.blocks);
      setTxs(t.txs);
      setIsOffline(false);
    } catch (err) {
      if (err instanceof ExplorerOfflineError) {
        setIsOffline(true);
        // Show mock data when offline
        setStats(MOCK_STATS);
        setBlocks(MOCK_BLOCKS);
        setTxs(MOCK_TXS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 6000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    if (/^\d+$/.test(q)) {
      router.push(`/explorer/blocks/${q}`);
    } else if (q.length >= 40 && !q.toLowerCase().startsWith('tamizhi1')) {
      router.push(`/explorer/txs/${q.toUpperCase()}`);
    } else if (q.toLowerCase().startsWith('tamizhi1')) {
      router.push(`/explorer/address/${q}`);
    } else {
      router.push(`/explorer/blocks/${q}`);
    }
    setSearching(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Block Explorer
          </h1>
          <p className="tamil-text text-cyan-400 text-sm mt-0.5">தொகுதி ஆய்வாளர்</p>
        </div>
        <button
          onClick={fetchAll}
          className="p-2 rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-[#1a1040] transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Offline banner */}
      {isOffline && (
        <ChainOfflineBanner onRetry={fetchAll} />
      )}

      {/* Search */}
      <form onSubmit={handleSearch}>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by block height, tx hash, or address…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#1a1040] border border-[#2a1f5c] text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 rounded-xl transition-colors font-semibold"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        {[
          { href: '/explorer/blocks', label: 'Blocks', labelTamil: 'தொகுதிகள்', icon: Blocks },
          { href: '/explorer/validators', label: 'Validators', labelTamil: 'சரிபார்ப்பாளர்கள்', icon: Users },
          { href: '/literature', label: 'Literature', labelTamil: 'இலக்கியம்', icon: BookOpen },
        ].map(({ href, label, labelTamil, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1040] border border-[#2a1f5c] hover:border-cyan-400/30 text-gray-400 hover:text-white transition-all text-sm"
          >
            <Icon className="w-4 h-4 text-cyan-400" />
            <span>{label}</span>
            <span className="tamil-text text-cyan-400 text-xs">{labelTamil}</span>
            <ChevronRight className="w-3 h-3 text-gray-500" />
          </Link>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Blocks"
              labelTamil="மொத்த தொகுதிகள்"
              value={stats ? stats.total_blocks.toLocaleString() : '—'}
              icon={Layers}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              label="Total Txs"
              labelTamil="மொத்த பரிவர்த்தனைகள்"
              value={stats ? stats.total_transactions.toLocaleString() : '—'}
              icon={ArrowRightLeft}
              color="text-purple-400"
              bg="bg-purple-500/10"
            />
            <StatCard
              label="Active Nodes"
              labelTamil="செயலில் உள்ள முனைகள்"
              value={stats ? stats.total_nodes.toLocaleString() : '—'}
              icon={Users}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <StatCard
              label="Literature Works"
              labelTamil="இலக்கியப் படைப்புகள்"
              value={stats ? stats.total_literature_works.toLocaleString() : '—'}
              icon={BookOpen}
              color="text-yellow-400"
              bg="bg-yellow-500/10"
            />
          </>
        )}
      </div>

      {/* Latest block highlighted card */}
      {stats?.latest_block && <LatestBlockCard block={stats.latest_block} />}

      {/* Two-column tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Latest Blocks */}
        <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a1f5c]">
            <div className="flex items-center gap-2">
              <Blocks className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Latest Blocks</span>
              <span className="tamil-text text-cyan-400 text-xs">சமீபத்திய தொகுதிகள்</span>
            </div>
            <Link
              href="/explorer/blocks"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a1f5c]/60">
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5">Height</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5 hidden sm:table-cell">Hash</th>
                  <th className="text-center text-xs text-gray-500 font-medium px-4 py-2.5">Txs</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-2.5">Age</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={10} cols={4} />
                ) : blocks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No blocks found
                    </td>
                  </tr>
                ) : (
                  blocks.map((block) => (
                    <tr
                      key={block.height}
                      className="border-b border-[#2a1f5c]/40 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/explorer/blocks/${block.height}`}
                          className="text-cyan-400 hover:text-cyan-300 font-mono text-sm font-semibold transition-colors"
                        >
                          #{block.height.toLocaleString()}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-gray-400 font-mono text-xs">
                          {truncateHash(block.hash, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${
                            block.tx_count > 0
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-gray-700/50 text-gray-500'
                          }`}
                        >
                          {block.tx_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-500 text-xs flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {timeAgo(block.time)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Latest Transactions */}
        <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a1f5c]">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Latest Transactions</span>
              <span className="tamil-text text-cyan-400 text-xs">சமீபத்திய பரிவர்த்தனைகள்</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a1f5c]/60">
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5">Tx Hash</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5 hidden sm:table-cell">Type</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5 hidden md:table-cell">From</th>
                  <th className="text-center text-xs text-gray-500 font-medium px-4 py-2.5">Status</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-2.5">Age</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={10} cols={5} />
                ) : txs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  txs.map((tx) => (
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 font-mono">
                          {(tx.msg_types[0] ?? 'unknown').replace('Msg', '')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-400 font-mono text-xs">
                          {truncate(tx.sender, 14)}
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
                        <span className="text-gray-500 text-xs">
                          {tx.time ? timeAgo(tx.time) : `Block #${tx.height}`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
