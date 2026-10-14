import React, { useState, useEffect, useCallback } from 'react';
import { getLiterature, uploadLiterature } from '../lib/api';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';
import { Modal } from '../components/common/Modal';
import type { LiteraryWork } from '../../../shared/types';

// MARK: - Types / Constants

type Period = 'sangam' | 'medieval' | 'bhakti' | 'colonial' | 'modern' | 'contemporary';
type Genre = 'sangam' | 'bhakti' | 'epic' | 'modern' | 'grammar' | 'other';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'sangam', label: 'சங்க இலக்கியம்' },
  { value: 'medieval', label: 'இடைக்காலம்' },
  { value: 'bhakti', label: 'பக்தி இலக்கியம்' },
  { value: 'colonial', label: 'காலனி காலம்' },
  { value: 'modern', label: 'நவீன இலக்கியம்' },
  { value: 'contemporary', label: 'சமகால இலக்கியம்' },
];

const GENRES: { value: Genre; label: string }[] = [
  { value: 'sangam', label: 'கவிதை' },
  { value: 'bhakti', label: 'பக்தி' },
  { value: 'epic', label: 'இதிகாசம்' },
  { value: 'modern', label: 'நவீன' },
  { value: 'grammar', label: 'இலக்கணம்' },
  { value: 'other', label: 'Other' },
];

// MARK: - LiteraturePage

const LiteraturePage: React.FC = () => {
  const [works, setWorks] = useState<LiteraryWork[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedPeriods, setSelectedPeriods] = useState<Set<Period>>(new Set());
  const [selectedGenres, setSelectedGenres] = useState<Set<Genre>>(new Set());
  const [selectedWork, setSelectedWork] = useState<LiteraryWork | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const PAGE_SIZE = 20;

  const fetchWorks = useCallback(async (pg = 1, reset = false) => {
    setIsLoading(true);
    try {
      const params: Parameters<typeof getLiterature>[0] = {
        page: pg,
        limit: PAGE_SIZE,
        search: search || undefined,
        period: selectedPeriods.size === 1 ? [...selectedPeriods][0] : undefined,
      };
      const resp = await getLiterature(params);
      setWorks(reset ? resp.works : (prev) => [...prev, ...resp.works]);
      setTotal(resp.total);
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedPeriods]);

  useEffect(() => {
    setPage(1);
    fetchWorks(1, true);
  }, [search, selectedPeriods, selectedGenres]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchWorks(nextPage, false);
  };

  const filteredWorks = works.filter((w) => {
    if (selectedGenres.size > 0 && !selectedGenres.has(w.genre as Genre)) return false;
    return true;
  });

  return (
    <div className="flex h-full bg-navy-950 overflow-hidden">
      {/* LEFT Sidebar */}
      <div className="w-56 shrink-0 border-r border-white/10 flex flex-col overflow-y-auto p-4 space-y-6">
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Period / காலம்</p>
          <div className="space-y-1.5">
            {PERIODS.map((p) => (
              <label key={p.value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedPeriods.has(p.value)}
                  onChange={() => {
                    setSelectedPeriods((prev) => {
                      const next = new Set(prev);
                      next.has(p.value) ? next.delete(p.value) : next.add(p.value);
                      return next;
                    });
                  }}
                  className="w-3.5 h-3.5 accent-saffron-500"
                />
                <span className="text-xs text-white/70 group-hover:text-white transition-colors">
                  {p.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Genre / வகை</p>
          <div className="space-y-1.5">
            {GENRES.map((g) => (
              <label key={g.value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedGenres.has(g.value)}
                  onChange={() => {
                    setSelectedGenres((prev) => {
                      const next = new Set(prev);
                      next.has(g.value) ? next.delete(g.value) : next.add(g.value);
                      return next;
                    });
                  }}
                  className="w-3.5 h-3.5 accent-saffron-500"
                />
                <span className="text-xs text-white/70 group-hover:text-white transition-colors">
                  {g.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => {
            setSelectedPeriods(new Set());
            setSelectedGenres(new Set());
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* MAIN Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-white/10">
          <div className="flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search works, authors… / தேடுங்கள்…"
              className="w-full bg-white/[0.07] text-white placeholder-white/30 rounded-lg px-4 py-2.5 text-sm outline-none border border-transparent focus:border-gold-400/40"
            />
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
              </svg>
            }
            onClick={() => setShowUpload(true)}
          >
            Upload Work
          </Button>
        </div>

        {/* Results info */}
        <div className="px-5 py-2 border-b border-white/5">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : `${filteredWorks.length} of ${total} works`}
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && filteredWorks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" />
            </div>
          ) : filteredWorks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-3">
              <span className="text-5xl">📚</span>
              <p className="text-sm">No works found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredWorks.map((work) => (
                  <WorkCard key={work.id} work={work} onClick={() => setSelectedWork(work)} />
                ))}
              </div>

              {filteredWorks.length < total && (
                <div className="flex justify-center mt-6">
                  <Button variant="secondary" size="md" loading={isLoading} onClick={handleLoadMore}>
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT Detail Panel */}
      {selectedWork && (
        <div className="w-80 shrink-0 border-l border-white/10 overflow-y-auto">
          <WorkDetailPanel work={selectedWork} onClose={() => setSelectedWork(null)} />
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
};

// MARK: - Work Card

const WorkCard: React.FC<{ work: LiteraryWork; onClick: () => void }> = ({ work, onClick }) => (
  <button
    onClick={onClick}
    className="text-left bg-navy-800 border border-white/10 rounded-xl p-4 space-y-3 hover:border-saffron-500/40 hover:bg-navy-700 transition-all duration-150 group"
  >
    <div className="flex items-start justify-between gap-2">
      <Badge variant="default" className="text-[10px]">
        {work.period}
      </Badge>
      {work.chainProofHash && (
        <svg className="w-4 h-4 text-gold-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
    </div>

    <div>
      <p className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-saffron-300 transition-colors">
        {work.title}
      </p>
      <p className="text-white/50 text-xs mt-1">{work.author}</p>
    </div>

    <div className="flex flex-wrap gap-1.5">
      <span className="text-[10px] bg-navy-700 text-white/60 px-2 py-0.5 rounded-full border border-white/10">
        {work.genre}
      </span>
      <span className="text-[10px] bg-navy-700 text-white/60 px-2 py-0.5 rounded-full border border-white/10">
        {work.language === 'classical-tamil' ? 'Classical' : 'Modern'}
      </span>
    </div>
  </button>
);

// MARK: - Work Detail Panel

const WorkDetailPanel: React.FC<{ work: LiteraryWork; onClose: () => void }> = ({ work, onClose }) => (
  <div className="p-5 space-y-5">
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-white font-semibold text-base leading-snug">{work.title}</h3>
      <button
        onClick={onClose}
        className="p-1 text-white/40 hover:text-white shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="default">{work.period}</Badge>
        <Badge variant="gold">{work.genre}</Badge>
        {work.chainProofHash && <Badge variant="success">Verified</Badge>}
      </div>

      <p className="text-white/60 text-sm">Author: {work.author}</p>
    </div>

    {work.summary && (
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Summary</p>
        <p className="text-sm text-white/70 leading-relaxed">{work.summary}</p>
      </div>
    )}

    {work.content && (
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Content</p>
        <div className="bg-navy-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{work.content}</p>
        </div>
      </div>
    )}

    {work.chainProofHash && (
      <div className="bg-navy-800 border border-green-700/30 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          On-Chain Proof
        </p>
        <p className="text-xs font-mono text-white/50 break-all">{work.chainProofHash}</p>
        {work.chainHeight && (
          <p className="text-xs text-white/40">Block #{work.chainHeight}</p>
        )}
      </div>
    )}

    {work.id && (
      <div className="space-y-2">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => window.tamizhi.openExternal(`https://ipfs.io/ipfs/${work.id}`)}
        >
          Open on IPFS ↗
        </Button>
      </div>
    )}
  </div>
);

// MARK: - Upload Modal

const UploadModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [period, setPeriod] = useState<Period>('sangam');
  const [genre, setGenre] = useState<Genre>('sangam');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dropRef = React.useRef<HTMLDivElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleUpload = async () => {
    if (!title || !author) { setError('Title and author are required'); return; }
    setError('');
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('author', author);
      form.append('period', period);
      form.append('genre', genre);
      if (content) form.append('content', content);
      if (file) form.append('file', file);

      const result = await uploadLiterature(form);
      setSuccess(`Uploaded! IPFS CID: ${result.ipfsCid}`);
      setTimeout(() => { onClose(); setSuccess(''); }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Literary Work"
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={isUploading} onClick={handleUpload}>Upload to IPFS</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={[
            'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
            isDragging ? 'border-saffron-500 bg-saffron-500/10' : 'border-white/20 hover:border-white/40',
          ].join(' ')}
          onClick={() => document.getElementById('upload-file-input')?.click()}
        >
          <input
            id="upload-file-input"
            type="file"
            hidden
            accept=".txt,.pdf,.md,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <svg className="w-10 h-10 text-white/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
          </svg>
          <p className="text-sm text-white/50">
            {file ? file.name : 'Drag & drop file or click to browse'}
          </p>
          <p className="text-xs text-white/30 mt-1">TXT, PDF, MD, DOCX supported</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="w-full bg-white/[0.07] text-white rounded-lg px-3 py-2.5 text-sm outline-none border border-transparent focus:border-gold-400/40"
            >
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as Genre)}
              className="w-full bg-white/[0.07] text-white rounded-lg px-3 py-2.5 text-sm outline-none border border-transparent focus:border-gold-400/40"
            >
              {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Content (or paste text)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Paste Tamil text content here…"
            className="w-full bg-white/[0.07] text-white placeholder-white/25 rounded-lg px-3 py-2.5 text-sm outline-none border border-transparent focus:border-gold-400/40 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}
      </div>
    </Modal>
  );
};

export default LiteraturePage;
