'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trophy,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { TableSkeleton } from '@/components/explorer/ExplorerSkeletons';
import { getValidators, ExplorerOfflineError, type Validator } from '@/lib/explorer-api';

function statusBadge(status: string) {
  if (status === 'BOND_STATUS_BONDED')
    return <Badge variant="success" dot>Active</Badge>;
  if (status === 'BOND_STATUS_UNBONDING')
    return <Badge variant="warning" dot>Unbonding</Badge>;
  return <Badge variant="error" dot>Inactive</Badge>;
}

function formatTokens(tokens: string): string {
  const n = Number(tokens) / 1_000_000;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M TMZ`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K TMZ`;
  return `${n.toFixed(2)} TMZ`;
}

function formatCommission(rate: string): string {
  return `${(Number(rate) * 100).toFixed(2)}%`;
}

export default function ValidatorsPage() {
  const validatorsQuery = useQuery<Validator[], Error>({
    queryKey: ['explorer', 'validators'],
    queryFn: getValidators,
    refetchInterval: 30_000,
    retry: false,
  });

  const isOffline = validatorsQuery.error instanceof ExplorerOfflineError;
  const validators = validatorsQuery.data ?? [];

  // Sort by voting power descending
  const sorted = [...validators].sort(
    (a, b) => Number(b.tokens) - Number(a.tokens)
  );

  const totalBonded = sorted.reduce((acc, v) => acc + Number(v.tokens), 0);

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
            <Users className="w-5 h-5 text-primary-400" />
            Validators
          </h1>
          <p className="tamil-text text-primary-400 text-xs">சரிபார்ப்பாளர்கள்</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {validators.length > 0 && (
            <span className="text-text-muted text-xs">
              {validators.length} validators
            </span>
          )}
          <button
            onClick={() => validatorsQuery.refetch()}
            className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-primary-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${validatorsQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isOffline && <ChainOfflineBanner onRetry={() => validatorsQuery.refetch()} />}

      {/* Summary cards */}
      {!validatorsQuery.isLoading && validators.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-background-card border border-background-border">
            <div className="inline-flex p-2 rounded-lg bg-green-500/10 mb-3">
              <ShieldCheck className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xl font-bold text-white">
              {validators.filter((v) => v.status === 'BOND_STATUS_BONDED').length}
            </div>
            <div className="text-text-muted text-xs mt-0.5">Active</div>
            <div className="tamil-text text-text-muted text-xs">செயலில்</div>
          </div>
          <div className="p-4 rounded-xl bg-background-card border border-background-border">
            <div className="inline-flex p-2 rounded-lg bg-red-500/10 mb-3">
              <ShieldOff className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl font-bold text-white">
              {validators.filter((v) => v.jailed).length}
            </div>
            <div className="text-text-muted text-xs mt-0.5">Jailed</div>
            <div className="tamil-text text-text-muted text-xs">சிறையில்</div>
          </div>
          <div className="p-4 rounded-xl bg-background-card border border-background-border col-span-2 sm:col-span-1">
            <div className="inline-flex p-2 rounded-lg bg-primary-500/10 mb-3">
              <Shield className="w-4 h-4 text-primary-400" />
            </div>
            <div className="text-xl font-bold text-white">
              {formatTokens(String(totalBonded))}
            </div>
            <div className="text-text-muted text-xs mt-0.5">Total Bonded</div>
            <div className="tamil-text text-text-muted text-xs">மொத்த பிணைப்பு</div>
          </div>
        </div>
      )}

      {/* Validators table */}
      <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-border">
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Rank</th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Validator</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3 hidden sm:table-cell">Voting Power</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3 hidden md:table-cell">Share</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3 hidden lg:table-cell">Commission</th>
                <th className="text-center text-xs text-text-muted font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {validatorsQuery.isLoading ? (
                <TableSkeleton rows={20} cols={6} />
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-muted text-sm">
                    {isOffline ? 'Chain offline' : 'No validators found'}
                  </td>
                </tr>
              ) : (
                sorted.map((v, i) => {
                  const share =
                    totalBonded > 0
                      ? ((Number(v.tokens) / totalBonded) * 100).toFixed(2)
                      : '0.00';
                  return (
                    <motion.tr
                      key={v.operator_address}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-background-border/40 hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center w-7 h-7">
                          {i === 0 ? (
                            <Trophy className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <span className="text-text-muted text-sm font-mono">{i + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-text-primary text-sm font-medium">
                            {v.description.moniker || 'Unknown'}
                          </p>
                          <p className="text-text-muted font-mono text-xs mt-0.5">
                            {v.operator_address.slice(0, 20)}...
                          </p>
                          {v.description.website && (
                            <a
                              href={v.description.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-400 text-xs hover:underline"
                            >
                              {v.description.website}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-sm text-text-primary">
                          {formatTokens(v.tokens)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${Math.min(100, Number(share))}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-text-secondary">
                            {share}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="flex items-center justify-end gap-1 font-mono text-sm text-text-secondary">
                          <Percent className="w-3 h-3" />
                          {formatCommission(v.commission.commission_rates.rate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {v.jailed ? (
                          <Badge variant="error" size="xs" dot>Jailed</Badge>
                        ) : (
                          statusBadge(v.status)
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
