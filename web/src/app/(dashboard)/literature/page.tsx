'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Upload, BookOpen, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchLiterature, getLiterature } from '@/lib/api';
import { WorkCard } from '@/components/literature/WorkCard';
import { UploadModal } from '@/components/literature/UploadModal';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

const periods = [
  'All Periods',
  'Sangam (300 BCE – 300 CE)',
  'Post-Sangam (300–600 CE)',
  'Pallava (600–900 CE)',
  'Medieval (900–1600 CE)',
  'Colonial (1600–1947 CE)',
  'Modern (1947–present)',
];

const genres = [
  'All Genres',
  'Poetry',
  'Epic',
  'Grammar',
  'Philosophy',
  'Devotional',
  'Prose',
  'Drama',
  'Folk Literature',
];

export default function LiteraturePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('All Periods');
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: works, isLoading, error } = useQuery({
    queryKey: ['literature', debouncedQuery, selectedPeriod, selectedGenre],
    queryFn: async () => {
      // 1. Try the backend REST API first (has search + filter support)
      try {
        if (debouncedQuery) {
          const res = await searchLiterature({
            q: debouncedQuery,
            period: selectedPeriod !== 'All Periods' ? selectedPeriod : undefined,
            genre: selectedGenre !== 'All Genres' ? selectedGenre : undefined,
          });
          if (res.data?.length) return res.data;
        } else {
          const res = await getLiterature({
            period: selectedPeriod !== 'All Periods' ? selectedPeriod : undefined,
            genre: selectedGenre !== 'All Genres' ? selectedGenre : undefined,
          });
          if (res.data?.length) return res.data;
        }
      } catch {
        // Backend offline — fall through to on-chain query
      }

      // 2. Fallback: query the CosmWasm literary NFT contract directly
      const contractAddr = process.env.NEXT_PUBLIC_NFT_CONTRACT;
      if (!contractAddr) return [];

      const REST = process.env.NEXT_PUBLIC_CHAIN_LCD || 'http://localhost:1317';
      const query = encodeURIComponent(JSON.stringify({ all_works: { limit: 50 } }));
      const res = await fetch(
        `${REST}/cosmwasm/wasm/v1/contract/${contractAddr}/smart/${query}`
      );
      if (!res.ok) return [];
      const { data } = await res.json();

      // Map on-chain WorkInfoResponse → LiteratureWork shape
      return (data?.works ?? []).map((w: any) => ({
        id: w.token_id,
        titleTamil: w.work.title,
        titleTransliterated: w.work.title_transliterated,
        titleEnglish: w.work.title_english ?? w.work.title_transliterated,
        author: w.work.author_name_transliterated ?? w.work.author_name,
        period: w.work.period,
        genre: w.work.genre,
        ipfsCid: w.work.ipfs_cid,
        isVerified: w.work.is_verified,
        txHash: '',
        blockHeight: w.work.block_height,
        timestamp: new Date(w.work.timestamp * 1000).toISOString(),
        tags: w.work.tags ?? [],
        language: w.work.language,
        license: w.work.license,
        description: w.work.description ?? '',
        uploaderAddress: w.work.uploaded_by,
        fileSize: String(w.work.size_bytes),
        fileType: w.work.mime_type ?? 'text/plain',
        excerpt: undefined,
      }));
    },
    placeholderData: [],
    staleTime: 30_000,
  });

  const displayWorks = works ?? [];

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Literature</h1>
          <p className="tamil-text text-primary-400 text-sm">இலக்கியம்</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Work</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search Tamil literature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors',
              showFilters
                ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                : 'bg-surface-DEFAULT border-background-border text-text-secondary hover:text-white'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Filter</span>
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full bg-surface-DEFAULT border border-background-border text-text-primary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              >
                {periods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-surface-DEFAULT border border-background-border text-text-primary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              >
                {genres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Active filter badges */}
      {(selectedPeriod !== 'All Periods' || selectedGenre !== 'All Genres') && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedPeriod !== 'All Periods' && (
            <Badge variant="primary" onRemove={() => setSelectedPeriod('All Periods')}>
              {selectedPeriod}
            </Badge>
          )}
          {selectedGenre !== 'All Genres' && (
            <Badge variant="primary" onRemove={() => setSelectedGenre('All Genres')}>
              {selectedGenre}
            </Badge>
          )}
        </div>
      )}

      {/* Results info */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-muted">
          {isLoading ? 'Searching...' : `${displayWorks.length} works found`}
        </p>
        {debouncedQuery && (
          <p className="text-sm text-text-secondary">
            Results for &ldquo;<span className="text-primary-400">{debouncedQuery}</span>&rdquo;
          </p>
        )}
      </div>

      {/* Works Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-text-muted">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Failed to load literature. Please try again.</p>
        </div>
      ) : displayWorks.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg mb-2">No works found</p>
          <p className="text-sm">
            {debouncedQuery
              ? 'Try adjusting your search or filters'
              : 'The chain is offline or no works have been minted yet'}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {displayWorks.map((work: any, i: number) => (
            <motion.div
              key={work.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <WorkCard work={work} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
