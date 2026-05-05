'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Code2,
  FileText,
  ExternalLink,
  BadgeCheck,
  BookOpen,
  User,
  Clock,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ChainOfflineBanner } from '@/components/explorer/ChainOfflineBanner';
import { DetailSkeleton, CardSkeleton } from '@/components/explorer/ExplorerSkeletons';
import {
  getContractInfo,
  queryContract,
  ExplorerOfflineError,
  type ContractInfo,
  type LiteraryWork,
} from '@/lib/explorer-api';

const NFT_CONTRACT =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_NFT_CONTRACT) ?? '';

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

function LiteraryWorkCard({ work }: { work: LiteraryWork }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-background-card border border-background-border hover:border-primary-500/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm line-clamp-1">
            {work.title || 'Untitled Work'}
          </h3>
          {work.title_tamil && (
            <p className="tamil-text text-primary-400 text-xs mt-0.5">{work.title_tamil}</p>
          )}
        </div>
        {work.is_verified && (
          <span title="Verified">
            <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        {work.author && (
          <div className="flex items-center gap-1.5 text-text-secondary">
          <User className="w-3 h-3 text-text-muted" />
            <span>{work.author}</span>
          </div>
        )}
        {work.period && (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Clock className="w-3 h-3 text-text-muted" />
            <span>{work.period}</span>
          </div>
        )}
        {work.genre && (
          <Badge variant="secondary" size="xs" className="mt-1">{work.genre}</Badge>
        )}
      </div>

      {work.description && (
        <p className="text-text-muted text-xs mt-3 line-clamp-2">{work.description}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        {work.ipfs_cid && (
          <a
            href={`https://ipfs.io/ipfs/${work.ipfs_cid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            <Globe className="w-3 h-3" />
            IPFS
          </a>
        )}
        {work.token_id && (
          <span className="text-text-muted text-xs font-mono">Token #{work.token_id}</span>
        )}
      </div>
    </motion.div>
  );
}

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const isNFTContract = address === NFT_CONTRACT || NFT_CONTRACT === '';

  const infoQuery = useQuery<ContractInfo, Error>({
    queryKey: ['explorer', 'contractInfo', address],
    queryFn: () => getContractInfo(address),
    retry: false,
    staleTime: 60_000,
  });

  const worksQuery = useQuery<unknown, Error>({
    queryKey: ['explorer', 'contractWorks', address],
    queryFn: () =>
      queryContract(address, { all_works: { limit: 20 } }),
    retry: false,
    staleTime: 60_000,
    enabled: isNFTContract,
  });

  const isOffline =
    infoQuery.error instanceof ExplorerOfflineError ||
    worksQuery.error instanceof ExplorerOfflineError;

  const info = infoQuery.data;
  const ci = info?.contract_info;

  // Normalize works response — contract may return { works: [...] } or [...] directly
  const rawWorks = worksQuery.data;
  const works: LiteraryWork[] = Array.isArray(rawWorks)
    ? rawWorks
    : Array.isArray((rawWorks as any)?.works)
    ? (rawWorks as any).works
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/explorer/contracts"
          className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary-400" />
            Contract
          </h1>
          <p className="tamil-text text-primary-400 text-xs">ஒப்பந்தம்</p>
        </div>
      </div>

      {isOffline && <ChainOfflineBanner onRetry={() => { infoQuery.refetch(); worksQuery.refetch(); }} />}

      {infoQuery.isLoading ? (
        <DetailSkeleton />
      ) : infoQuery.error && !isOffline ? (
        <div className="rounded-xl bg-background-card border border-background-border p-8 text-center text-text-muted">
          Contract not found
          <p className="text-xs mt-1 font-mono">{address}</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Contract info */}
          <div className="rounded-xl bg-background-card border border-background-border overflow-hidden">
            <div className="px-5 py-4 border-b border-background-border">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary-400" />
                Contract Info
                <span className="tamil-text text-primary-400 text-xs font-normal">தகவல்</span>
                {isNFTContract && NFT_CONTRACT && (
                  <Badge variant="accent" size="xs">Literary NFT</Badge>
                )}
              </h2>
            </div>
            <div className="px-5">
              <DetailRow label="Address" labelTamil="முகவரி">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-text-primary break-all">{address}</span>
                  <CopyButton text={address} />
                </div>
              </DetailRow>

              {ci?.label && (
                <DetailRow label="Label" labelTamil="பெயரிட்டு">
                  <span className="text-text-primary text-sm">{ci.label}</span>
                </DetailRow>
              )}

              {ci?.code_id && (
                <DetailRow label="Code ID" labelTamil="குறியீடு ID">
                  <Badge variant="secondary">#{ci.code_id}</Badge>
                </DetailRow>
              )}

              {ci?.creator && (
                <DetailRow label="Creator" labelTamil="உருவாக்கியவர்">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-secondary break-all">{ci.creator}</span>
                    <CopyButton text={ci.creator} />
                  </div>
                </DetailRow>
              )}

              {ci?.admin && (
                <DetailRow label="Admin" labelTamil="நிர்வாகி">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-secondary break-all">{ci.admin}</span>
                    <CopyButton text={ci.admin} />
                  </div>
                </DetailRow>
              )}

              {ci?.created?.block_height && (
                <DetailRow label="Created at Block" labelTamil="உருவாக்கப்பட்டது">
                  <Link
                    href={`/explorer/blocks/${ci.created.block_height}`}
                    className="text-primary-400 hover:text-primary-300 font-mono text-sm transition-colors"
                  >
                    #{Number(ci.created.block_height).toLocaleString()}
                  </Link>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Literary works — only shown for NFT contract */}
          {isNFTContract && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-primary-400" />
                <h2 className="text-sm font-semibold text-white">
                  Literary Works
                </h2>
                <span className="tamil-text text-primary-400 text-xs">இலக்கிய படைப்புகள்</span>
                {works.length > 0 && (
                  <Badge variant="primary" size="xs">{works.length}</Badge>
                )}
              </div>

              {worksQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : worksQuery.error && !isOffline ? (
                <div className="rounded-xl bg-background-card border border-background-border p-6 text-center">
                  <p className="text-text-muted text-sm">
                    Could not query contract state.
                  </p>
                  <p className="text-text-muted text-xs mt-1">
                    The contract may not implement the <code className="bg-surface-hover px-1 rounded">all_works</code> query.
                  </p>
                </div>
              ) : works.length === 0 ? (
                <div className="rounded-xl bg-background-card border border-background-border p-8 text-center">
                  <BookOpen className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No literary works found in this contract</p>
                  <p className="tamil-text text-text-muted text-xs mt-1">
                    இந்த ஒப்பந்தத்தில் படைப்புகள் இல்லை
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {works.map((work, i) => (
                    <LiteraryWorkCard key={work.id ?? i} work={work} />
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
