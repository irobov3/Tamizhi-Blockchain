'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Blocks,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { TableSkeleton } from '@/components/explorer/ExplorerSkeletons';
import { formatDistanceToNow } from 'date-fns';
import {
  getLatestBlock,
  getRecentBlocks,
  ExplorerOfflineError,
  type Block,
} from '@/lib/explorer-api';

const PAGE_SIZE = 20;

function truncate(s: string, n = 12) {
  if (!s) return '—';
  return s.length <= n ? s : `${s.slice(0, n)}...`;
}

export default function BlocksListPage() {
  const [page, setPage] = useState(0); // 0-indexed
  const [latestHeight, setLatestHeight] = useState<number | null>(null);

  // Fetch latest height once to anchor pagination
  const latestQuery = useQuery<Block, Error>({
    queryKey: ['explorer', 'latestBlock'],
    queryFn: getLatestBlock,
    refetchInterval: 12_000,
    retry: false,
  });

  useEffect(() => {
    if (latestQuery.data && latestHeight === null) {
      setLatestHeight(Number(latestQuery.data.block.header.height));
    }
    if (latestQuery.data && page === 0) {
      setLatestHeight(Number(latestQuery.data.block.header.height));
    }
  }, [latestQuery.data]);

  const fromHeight =
    latestHeight !== null ? latestHeight - page * PAGE_SIZE : null;

  const blocksQuery = useQuery<Block[], Error>({
    queryKey: ['explorer', 'blocks', fromHeight],
    queryFn: () => getRecentBlocks(fromHeight!, PAGE_SIZE),
    enabled: fromHeight !== null && fromHeight > 0,
    retry: false,
  });

  const isOffline =
    latestQuery.error instanceof ExplorerOfflineError ||
    blocksQuery.error instanceof ExplorerOfflineError;

  const blocks = blocksQuery.data ?? [];
  const canPrev = page > 0;
  const canNext = fromHeight !== null && fromHeight - PAGE_SIZE > 0;

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
            <Blocks className="w-5 h-5 text-primary-400" />
            Blocks
          </h1>
          <p className="tamil-text text-primary-400 text-xs">தொகுதிகள்</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setPage(0); latestQuery.refetch(); }}
            className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-primary-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${blocksQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
          {latestHeight !== null && (
            <span className="text-text-muted text-xs font-mono">
              Latest: #{latestHeight.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {isOffline && (
        <ChainOfflineBanner
          onRetry={() => {
            latestQuery.refetch();
            blocksQuery.refetch();
          }}
        />
      )}

      <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-border">
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Height</th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3 hidden sm:table-cell">Block Hash</th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3 hidden md:table-cell">Proposer</th>
                <th className="text-center text-xs text-text-muted font-medium px-4 py-3">Txs</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Age</th>
              </tr>
            </thead>
            <tbody>
              {blocksQuery.isLoading || latestQuery.isLoading ? (
                <TableSkeleton rows={PAGE_SIZE} cols={5} />
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-text-muted text-sm">
                    {isOffline ? 'Chain offline' : 'No blocks found'}
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
                      transition={{ delay: i * 0.02 }}
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
                          {truncate(hash, 14)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-text-secondary font-mono text-xs">
                          {truncate(proposer, 16)}
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-background-border">
          <span className="text-xs text-text-muted">
            {fromHeight !== null
              ? `Showing #${(fromHeight - PAGE_SIZE + 1).toLocaleString()} – #${fromHeight.toLocaleString()}`
              : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!canPrev}
              className="p-2 rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-muted px-2">Page {page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
              className="p-2 rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
