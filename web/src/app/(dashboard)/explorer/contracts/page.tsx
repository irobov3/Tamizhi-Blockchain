'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Code2,
  FileText,
  ExternalLink,
  RefreshCw,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { CardSkeleton } from '@/components/explorer/ExplorerSkeletons';
import {
  getWasmCodes,
  getAllContracts,
  ExplorerOfflineError,
  type WasmCode,
  type ContractInfo,
} from '@/lib/explorer-api';

const NFT_CONTRACT =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_NFT_CONTRACT) ?? '';

export default function ContractsPage() {
  const codesQuery = useQuery<WasmCode[], Error>({
    queryKey: ['explorer', 'wasmCodes'],
    queryFn: getWasmCodes,
    retry: false,
    staleTime: 60_000,
  });

  const contractsQuery = useQuery<ContractInfo[], Error>({
    queryKey: ['explorer', 'allContracts'],
    queryFn: getAllContracts,
    retry: false,
    staleTime: 60_000,
  });

  const isOffline =
    codesQuery.error instanceof ExplorerOfflineError ||
    contractsQuery.error instanceof ExplorerOfflineError;

  const codes = codesQuery.data ?? [];
  const contracts = contractsQuery.data ?? [];

  const refresh = () => {
    codesQuery.refetch();
    contractsQuery.refetch();
  };

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
            <Code2 className="w-5 h-5 text-primary-400" />
            CosmWasm Contracts
          </h1>
          <p className="tamil-text text-primary-400 text-xs">ஒப்பந்தங்கள்</p>
        </div>
        <button
          onClick={refresh}
          className="ml-auto p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-primary-400 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${codesQuery.isFetching || contractsQuery.isFetching ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {isOffline && <ChainOfflineBanner onRetry={refresh} />}

      {/* NFT contract highlight */}
      {NFT_CONTRACT && (
        <Link
          href={`/explorer/contracts/${NFT_CONTRACT}`}
          className="block p-5 rounded-xl bg-gradient-to-r from-primary-500/10 to-accent/10 border border-primary-500/25 hover:border-primary-500/50 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-accent">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">Literary NFT Contract</p>
                <Badge variant="accent" size="xs">Featured</Badge>
              </div>
              <p className="tamil-text text-primary-400 text-xs">இலக்கிய NFT ஒப்பந்தம்</p>
              <p className="font-mono text-xs text-text-muted mt-1 truncate">
                {NFT_CONTRACT}
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Code IDs */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Stored Code IDs
          <span className="tamil-text text-xs">சேமிக்கப்பட்ட குறியீடுகள்</span>
          {codes.length > 0 && (
            <Badge variant="default" size="xs">{codes.length}</Badge>
          )}
        </h2>

        {codesQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : codes.length === 0 ? (
          <p className="text-text-muted text-sm py-4">
            {isOffline ? 'Chain offline' : 'No codes stored on chain'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {codes.map((code, i) => (
              <motion.div
                key={code.code_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-background-card border border-background-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="primary" size="sm">Code #{code.code_id}</Badge>
                </div>
                <p className="text-text-muted text-xs">Creator</p>
                <p className="font-mono text-xs text-text-secondary truncate mt-0.5">
                  {code.creator}
                </p>
                {code.data_hash && (
                  <>
                    <p className="text-text-muted text-xs mt-2">Data Hash</p>
                    <p className="font-mono text-xs text-text-secondary truncate mt-0.5">
                      {code.data_hash.slice(0, 20)}...
                    </p>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Contracts list */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          Deployed Contracts
          <span className="tamil-text text-xs">நிறுவப்பட்ட ஒப்பந்தங்கள்</span>
          {contracts.length > 0 && (
            <Badge variant="default" size="xs">{contracts.length}</Badge>
          )}
        </h2>

        {contractsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : contracts.length === 0 ? (
          <p className="text-text-muted text-sm py-4">
            {isOffline ? 'Chain offline' : 'No contracts deployed yet'}
          </p>
        ) : (
          <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-background-border">
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Address</th>
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-3 hidden sm:table-cell">Label</th>
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-3 hidden md:table-cell">Code ID</th>
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-3 hidden lg:table-cell">Creator</th>
                    <th className="text-right text-xs text-text-muted font-medium px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract, i) => {
                    const addr = contract.address;
                    const isNFT = addr === NFT_CONTRACT;
                    return (
                      <motion.tr
                        key={addr}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-background-border/40 hover:bg-surface-hover transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-text-primary">
                              {addr.slice(0, 20)}...
                            </span>
                            {isNFT && <Badge variant="accent" size="xs">NFT</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-text-secondary text-sm">
                            {contract.contract_info?.label || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge variant="secondary" size="xs">
                            #{contract.contract_info?.code_id}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="font-mono text-xs text-text-muted">
                            {contract.contract_info?.creator?.slice(0, 16)}...
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/explorer/contracts/${addr}`}
                            className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 text-xs transition-colors"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
