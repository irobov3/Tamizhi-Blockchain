'use client';

import Link from 'next/link';
import { Shield, ExternalLink, Calendar, Tag, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

export interface LiteraryWork {
  id: string;
  titleTamil: string;
  titleTransliterated: string;
  titleEnglish?: string;
  author: string;
  period: string;
  genre: string;
  ipfsCid: string;
  isVerified: boolean;
  txHash?: string;
  timestamp?: string;
  excerpt?: string;
  tags?: string[];
}

interface WorkCardProps {
  work: LiteraryWork;
  className?: string;
}

const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs';

export function WorkCard({ work, className }: WorkCardProps) {
  const periodShort = work.period.split(' ')[0];

  return (
    <Link href={`/literature/${work.id}`}>
      <div
        className={clsx(
          'group relative flex flex-col h-full p-5 rounded-2xl bg-background-card border border-background-border hover:border-primary-500/30 transition-all duration-300 cursor-pointer overflow-hidden',
          className
        )}
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }}
      >
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="tamil-text text-white font-bold text-lg leading-tight truncate">
              {work.titleTamil}
            </h3>
            <p className="text-text-secondary text-sm truncate mt-0.5">
              {work.titleTransliterated}
            </p>
          </div>
          {work.isVerified && (
            <div className="flex-shrink-0 p-1.5 rounded-full bg-green-500/10" title="Verified on-chain">
              <Shield className="w-3.5 h-3.5 text-green-400" />
            </div>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-400 text-xs font-bold">
              {work.author.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-text-secondary text-sm truncate">{work.author}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="primary" className="text-xs">{work.genre}</Badge>
          <Badge variant="secondary" className="text-xs">{periodShort}</Badge>
        </div>

        {/* Excerpt */}
        {work.excerpt && (
          <div className="flex-1 mb-3">
            <p className="tamil-text text-text-muted text-xs leading-relaxed line-clamp-2">
              {work.excerpt}
            </p>
          </div>
        )}

        {/* Tags */}
        {work.tags && work.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {work.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-text-muted px-2 py-0.5 rounded-full bg-surface-DEFAULT border border-background-border">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-background-border/50 mt-auto">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            {work.timestamp && (
              <>
                <Calendar className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(work.timestamp), { addSuffix: true })}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {work.ipfsCid && (
              <a
                href={`${IPFS_GATEWAY}/${work.ipfsCid}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                title="View on IPFS"
              >
                <ExternalLink className="w-3 h-3" />
                IPFS
              </a>
            )}
            {work.txHash && (
              <a
                href={`/explorer?tx=${work.txHash}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-white transition-colors"
                title="View chain proof"
              >
                <BookOpen className="w-3 h-3" />
                Proof
              </a>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
