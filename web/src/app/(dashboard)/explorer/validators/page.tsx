'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { TableSkeleton } from '@/components/explorer/ExplorerSkeletons';
import { getValidators, ExplorerOfflineError, type Validator } from '@/lib/explorer-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTokens(tokens: string): string {
  const n = Number(tokens) / 1_000_000;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M TMZ`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K TMZ`;
  return `${n.toFixed(2)} TMZ`;
}

function formatCommission(rate: string): string {
  return `${(Number(rate) * 100).toFixed(2)}%`;
}

function StatusBadge({ status, jailed }: { status: string; jailed?: boolean }) {
  if (jailed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        Jailed
      </span>
    );
  }
  if (status === 'BOND_STATUS_BONDED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === 'BOND_STATUS_UNBONDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        Unbonding
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-700/50 text-gray-400 font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
      Inactive
    </span>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_VALIDATORS: Validator[] = Array.from({ length: 5 }, (_, i) => ({
  operator_address: `tamizhi1valoper${(i + 1).toString().padStart(6, '0')}abc`,
  description: {
    moniker: ['Tamizhi Node 1', 'Chennai Validator', 'Madurai Stake', 'Coimbatore Hub', 'Salem Node'][i],
    website: '',
    identity: '',
  },
  commission: {
    commission_rates: {
      rate: (0.05 + i * 0.02).toFixed(2),
      max_rate: '0.20',
    },
  },
  status: 'BOND_STATUS_BONDED',
  tokens: String((1_000_000 - i * 100_000) * 1_000_000),
  jailed: false,
}));

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ValidatorsPage() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const fetchValidators = async () => {
    setFetching(true);
    try {
      const vs = await getValidators();
      setValidators(vs);
      setIsOffline(false);
    } catch (err) {
      if (err instanceof ExplorerOfflineError) {
        setIsOffline(true);
        setValidators(MOCK_VALIDATORS);
      }
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchValidators();
    const id = setInterval(fetchValidators, 30000);
    return () => clearInterval(id);
  }, []);

  // Sort by voting power descending
  const sorted = [...validators].sort((a, b) => Number(b.tokens) - Number(a.tokens));
  const maxTokens = sorted.length > 0 ? Number(sorted[0].tokens) : 1;
  const totalBonded = sorted.reduce((acc, v) => acc + Number(v.tokens), 0);

  const activeCt = validators.filter((v) => v.status === 'BOND_STATUS_BONDED' && !v.jailed).length;
  const jailedCt = validators.filter((v) => v.jailed).length;

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
            <Users className="w-5 h-5 text-cyan-400" />
            Validators
          </h1>
          <p className="tamil-text text-cyan-400 text-xs">சரிபார்ப்பாளர்கள்</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {validators.length > 0 && (
            <span className="text-gray-500 text-xs">
              {validators.length} validators
            </span>
          )}
          <button
            onClick={fetchValidators}
            className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isOffline && <ChainOfflineBanner onRetry={fetchValidators} />}

      {/* Summary cards */}
      {!loading && validators.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#1a1040] border border-[#2a1f5c]">
            <div className="inline-flex p-2 rounded-lg bg-green-500/10 mb-3">
              <ShieldCheck className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xl font-bold text-white">{activeCt}</div>
            <div className="text-gray-400 text-xs mt-0.5">Active</div>
            <div className="tamil-text text-gray-500 text-xs">செயலில்</div>
          </div>
          <div className="p-4 rounded-xl bg-[#1a1040] border border-[#2a1f5c]">
            <div className="inline-flex p-2 rounded-lg bg-red-500/10 mb-3">
              <ShieldOff className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl font-bold text-white">{jailedCt}</div>
            <div className="text-gray-400 text-xs mt-0.5">Jailed</div>
            <div className="tamil-text text-gray-500 text-xs">சிறையில்</div>
          </div>
          <div className="p-4 rounded-xl bg-[#1a1040] border border-[#2a1f5c] col-span-2 sm:col-span-1">
            <div className="inline-flex p-2 rounded-lg bg-cyan-500/10 mb-3">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-white">
              {formatTokens(String(totalBonded))}
            </div>
            <div className="text-gray-400 text-xs mt-0.5">Total Staked TMZ</div>
            <div className="tamil-text text-gray-500 text-xs">மொத்த பிணைப்பு</div>
          </div>
        </div>
      )}

      {/* Validators table */}
      <div className="rounded-xl bg-[#1a1040] border border-[#2a1f5c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a1f5c]">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Rank</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Validator</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">
                  Voting Power
                </th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3 hidden lg:table-cell">
                  Commission
                </th>
                <th className="text-center text-xs text-gray-500 font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={10} cols={5} />
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500 text-sm">
                    {isOffline ? 'Chain offline' : 'No validators found'}
                  </td>
                </tr>
              ) : (
                sorted.map((v, i) => {
                  const share =
                    totalBonded > 0
                      ? ((Number(v.tokens) / totalBonded) * 100).toFixed(2)
                      : '0.00';
                  const barWidth =
                    maxTokens > 0
                      ? Math.min(100, (Number(v.tokens) / maxTokens) * 100)
                      : 0;

                  return (
                    <tr
                      key={v.operator_address}
                      className="border-b border-[#2a1f5c]/40 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center w-7 h-7">
                          {i === 0 ? (
                            <Trophy className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <span className="text-gray-500 text-sm font-mono">{i + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-200 text-sm font-medium">
                            {v.description.moniker || 'Unknown'}
                          </p>
                          <p className="text-gray-500 font-mono text-xs mt-0.5">
                            {v.operator_address.slice(0, 20)}...
                          </p>
                          {v.description.website && (
                            <a
                              href={v.description.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 text-xs hover:underline"
                            >
                              {v.description.website}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-sm text-gray-200">
                            {formatTokens(v.tokens)}
                          </span>
                          <div className="flex items-center gap-2">
                            {/* Progress bar relative to max */}
                            <div className="w-20 h-1.5 rounded-full bg-[#0e0824] overflow-hidden">
                              <div
                                className="h-full bg-cyan-500 rounded-full"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-gray-500">{share}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="font-mono text-sm text-gray-300">
                          {formatCommission(v.commission.commission_rates.rate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={v.status} jailed={v.jailed} />
                      </td>
                    </tr>
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
