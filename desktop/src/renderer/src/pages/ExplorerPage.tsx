import React, { useState, useEffect, useCallback } from 'react';
import { getLatestBlocks, getChainStats, getTransactions } from '../lib/api';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import type { BlockInfo, Transaction } from '../../../shared/types';

// MARK: - Types

type Tab = 'blocks' | 'transactions';

interface ChainStats {
  latestHeight: number;
  activeValidators: number;
  bondedTokens: string;
  inflationRate: string;
}

// MARK: - ExplorerPage

const ExplorerPage: React.FC = () => {
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [blocks, setBlocks] = useState<BlockInfo[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('blocks');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [blockPage, setBlockPage] = useState(1);
  const [tps, setTps] = useState<number>(0);
  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [chainStats, blocksData] = await Promise.all([
        getChainStats(),
        getLatestBlocks(50),
      ]);
      setStats(chainStats);
      setBlocks(blocksData.blocks);

      // Rough TPS = tx count across last 10 blocks / 10 * block_time(6s)
      const last10 = blocksData.blocks.slice(0, 10);
      const totalTx = last10.reduce((sum, b) => sum + b.txCount, 0);
      setTps(parseFloat((totalTx / (10 * 6)).toFixed(2)));
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtered blocks
  const filteredBlocks = blocks.filter((b) =>
    search
      ? String(b.height).includes(search) ||
        b.hash.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const pagedBlocks = filteredBlocks.slice(0, blockPage * PAGE_SIZE);

  // Stat Cards data
  const statCards = [
    {
      label: 'Block Height',
      value: stats?.latestHeight.toLocaleString() ?? '—',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      color: 'from-blue-600 to-blue-800',
    },
    {
      label: 'TPS (avg)',
      value: String(tps),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      color: 'from-green-600 to-green-800',
    },
    {
      label: 'Validators',
      value: stats?.activeValidators.toString() ?? '—',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      color: 'from-purple-600 to-purple-800',
    },
    {
      label: 'Bonded TMZ',
      value: stats?.bondedTokens ?? '—',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      color: 'from-saffron-600 to-yellow-700',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-navy-950 overflow-auto">
      {/* Search + Refresh */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-white/10">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks, transactions, addresses…"
            className="w-full bg-white/[0.07] text-white placeholder-white/30 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border border-transparent focus:border-gold-400/40"
          />
        </div>
        <Button
          variant="secondary"
          size="md"
          loading={isLoading}
          onClick={fetchData}
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
          }
        >
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 px-6 py-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl p-5 bg-gradient-to-br ${card.color} shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/70 text-xs font-medium uppercase tracking-wide">
                {card.label}
              </span>
              <span className="text-white/50">{card.icon}</span>
            </div>
            {isLoading && !stats ? (
              <Spinner size="sm" color="text-white/50" />
            ) : (
              <p className="text-2xl font-bold text-white">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pb-0">
        {(['blocks', 'transactions'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors capitalize',
              activeTab === tab
                ? 'bg-navy-800 text-white border-t border-l border-r border-white/10'
                : 'text-white/40 hover:text-white/70',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 mx-6 mb-6 bg-navy-800 border border-white/10 rounded-b-2xl rounded-tr-2xl overflow-hidden">
        {activeTab === 'blocks' ? (
          <BlocksTable blocks={pagedBlocks} isLoading={isLoading} />
        ) : (
          <TransactionsTable transactions={transactions} isLoading={isLoading} />
        )}

        {/* Pagination */}
        {activeTab === 'blocks' && pagedBlocks.length < filteredBlocks.length && (
          <div className="flex justify-center py-4 border-t border-white/10">
            <Button variant="ghost" size="sm" onClick={() => setBlockPage((p) => p + 1)}>
              Load more blocks
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// MARK: - Blocks Table

const BlocksTable: React.FC<{ blocks: BlockInfo[]; isLoading: boolean }> = ({ blocks, isLoading }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-white/40 uppercase tracking-wider border-b border-white/10">
          <th className="text-left px-5 py-3">Height</th>
          <th className="text-left px-5 py-3">Hash</th>
          <th className="text-left px-5 py-3">Time</th>
          <th className="text-left px-5 py-3">Proposer</th>
          <th className="text-left px-5 py-3">TXs</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {isLoading && blocks.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-5 py-12 text-center">
              <Spinner size="md" className="mx-auto" />
            </td>
          </tr>
        ) : blocks.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-5 py-12 text-center text-white/30 text-sm">
              No blocks found
            </td>
          </tr>
        ) : (
          blocks.map((block) => (
            <tr key={block.height} className="hover:bg-white/[0.03] transition-colors">
              <td className="px-5 py-3">
                <span className="text-saffron-400 font-mono font-semibold">#{block.height.toLocaleString()}</span>
              </td>
              <td className="px-5 py-3">
                <span className="font-mono text-white/60 text-xs">{block.hash.slice(0, 16)}…</span>
              </td>
              <td className="px-5 py-3 text-white/50 text-xs whitespace-nowrap">
                {new Date(block.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="px-5 py-3">
                <span className="font-mono text-white/50 text-xs">{block.proposer.slice(0, 12)}…</span>
              </td>
              <td className="px-5 py-3">
                <Badge variant={block.txCount > 0 ? 'info' : 'default'}>
                  {block.txCount}
                </Badge>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// MARK: - Transactions Table

const TransactionsTable: React.FC<{ transactions: Transaction[]; isLoading: boolean }> = ({ transactions, isLoading }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-white/40 uppercase tracking-wider border-b border-white/10">
          <th className="text-left px-5 py-3">Hash</th>
          <th className="text-left px-5 py-3">Type</th>
          <th className="text-left px-5 py-3">Amount</th>
          <th className="text-left px-5 py-3">Status</th>
          <th className="text-left px-5 py-3">Height</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {isLoading ? (
          <tr><td colSpan={5} className="text-center py-12"><Spinner size="md" className="mx-auto" /></td></tr>
        ) : transactions.length === 0 ? (
          <tr><td colSpan={5} className="text-center py-12 text-white/30 text-sm">No transactions found</td></tr>
        ) : (
          transactions.map((tx) => (
            <tr key={tx.hash} className="hover:bg-white/[0.03] transition-colors">
              <td className="px-5 py-3 font-mono text-white/60 text-xs">{tx.hash.slice(0, 16)}…</td>
              <td className="px-5 py-3 text-white/70">{tx.type}</td>
              <td className="px-5 py-3 font-mono text-white">{tx.amount ? `${tx.amount} TMZ` : '—'}</td>
              <td className="px-5 py-3">
                <Badge variant={tx.status === 'success' ? 'success' : 'error'} dot>{tx.status}</Badge>
              </td>
              <td className="px-5 py-3 text-white/50 font-mono">#{tx.height}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default ExplorerPage;
