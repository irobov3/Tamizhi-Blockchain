'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Blocks,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { TableSkeleton } from '@/components/explorer/ExplorerSkeletons';
import {
  getBlocks,
  ExplorerOfflineError,
  timeAgo,
  truncateHash,
  type Block,
  type Pagination,
} from '@/lib/explorer-api';

const PAGE_SIZE = 20;

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BLOCKS: Block[] = Array.from({ length: PAGE_SIZE }, (_, i) => ({
  height: 142857 - i,
  hash: `${(0xA1B2C3D4E5F6A1B2 - i * 0x1000).toString(16).toUpperCase()}`,
  time: new Date(Date.now() - i * 6000).toISOString(),
  proposer: `tamizhi1valoper${(i + 1).toString().padStart(6, '0')}xyz`,
  tx_count: Math.floor(Math.random() * 8),
}));

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BlocksListPage() {
  const [page, setPage] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const fetchBlocks = useCallback(
    async (pageIndex: number) => {
      setFetching(true);
      try {
        const { blocks: b, pagination: p } = await getBlocks(
          PAGE_SIZE,
          pageIndex * PAGE_SIZE
        );
        setBlocks(b);
        setPagination(p);
        setIsOffline(false);
      } catch (err) {
        if (err instanceof ExplorerOfflineError) {
          setIsOffline(true);
          setBlocks(MOCK_BLOCKS);
          setPagination({ limit: PAGE_SIZE, offset: 0, total: 142857 });
        }
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchBlocks(page);
  }, [page, fetchBlocks]);

  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 0;
  const canPrev = page > 0;
  const canNext = totalPages > 0 && page < totalPages - 1;

  const rangeStart = pagination ? pagination.offset + 1 : 0;
  const rangeEnd = pagination
    ? Math.min(pagination.offset + PAGE_SIZE, pagination.total)
    : 0;

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
            <Blocks className="w-5 h-5 text-cyan-400" />
            Blocks
          </h1>
          <p className="tamil-text text-cyan-400 text-xs">தொகுதிகள்</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {pagination && (
            <span className="text-gray-500 text-xs font-mono">
              {pagination.total.toLocaleString()} total
            </span>
          )}
          <button
            onClick={() => fetchBlocks(page)}
            className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-cyan-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isOffline && (
        <ChainOfflineBanner onRetry={() => fetchBlocks(page)} />
      )}

      <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a1f5c]">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Height</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">
                  Block Hash
                </th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden md:table-cell">
                  Proposer
                </th>
                <th className="text-center text-xs text-gray-500 font-medium px-4 py-3">Txs</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Age</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={PAGE_SIZE} cols={5} />
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500 text-sm">
                    {isOffline ? 'Chain offline' : 'No blocks found'}
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
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-gray-400 font-mono text-xs">
                        {block.proposer
                          ? `${block.proposer.slice(0, 16)}...`
                          : '—'}
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a1f5c]">
          <span className="text-xs text-gray-500">
            {pagination
              ? `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${pagination.total.toLocaleString()}`
              : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!canPrev}
              className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 px-2">
              Page {page + 1}
              {totalPages > 0 ? ` / ${totalPages}` : ''}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
              className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
