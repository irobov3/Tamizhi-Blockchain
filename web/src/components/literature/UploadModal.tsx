'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  CloudUpload,
  Tag,
} from 'lucide-react';
import { uploadLiterature } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { clsx } from 'clsx';

interface UploadModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const periods = [
  'Sangam (300 BCE – 300 CE)',
  'Post-Sangam (300–600 CE)',
  'Pallava (600–900 CE)',
  'Medieval (900–1600 CE)',
  'Colonial (1600–1947 CE)',
  'Modern (1947–present)',
];

const genres = [
  'Poetry',
  'Epic',
  'Grammar',
  'Philosophy',
  'Devotional',
  'Prose',
  'Drama',
  'Folk Literature',
];

const licenses = [
  'Public Domain',
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'CC BY-NC 4.0',
  'CC BY-ND 4.0',
  'All Rights Reserved',
];

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [titleTamil, setTitleTamil] = useState('');
  const [titleTransliterated, setTitleTransliterated] = useState('');
  const [titleEnglish, setTitleEnglish] = useState('');
  const [author, setAuthor] = useState('');
  const [period, setPeriod] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [license, setLicense] = useState('Public Domain');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 1,
  });

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const isValid =
    titleTamil && titleTransliterated && author && period && genre && description && file;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !file) return;

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      await uploadLiterature(
        {
          titleTamil,
          titleTransliterated,
          titleEnglish: titleEnglish || titleTransliterated,
          author,
          period,
          genre,
          description,
          license,
          tags,
          file,
        },
        (percent) => setProgress(percent)
      );

      setSuccess(true);
      setProgress(100);
      onSuccess?.();
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-background-card border border-background-border rounded-2xl shadow-card-hover max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-background-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upload Literary Work</h2>
              <p className="tamil-text text-primary-400 text-xs">இலக்கியம் பதிவேற்றம்</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Work Uploaded!</h3>
            <p className="text-text-secondary text-sm">Your literary work has been stored on IPFS and registered on the Tamizhi blockchain.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Titles */}
            <div>
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Title Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Tamil Title *</label>
                  <input
                    type="text"
                    value={titleTamil}
                    onChange={(e) => setTitleTamil(e.target.value)}
                    placeholder="திருக்குறள்"
                    className="w-full tamil-text bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Transliterated Title *</label>
                    <input
                      type="text"
                      value={titleTransliterated}
                      onChange={(e) => setTitleTransliterated(e.target.value)}
                      placeholder="Thirukkural"
                      className="w-full bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">English Title</label>
                    <input
                      type="text"
                      value={titleEnglish}
                      onChange={(e) => setTitleEnglish(e.target.value)}
                      placeholder="The Sacred Kural"
                      className="w-full bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Author + Period + Genre */}
            <div>
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Author & Classification</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Author / Poet *</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Thiruvalluvar"
                    className="w-full bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Period *</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="w-full bg-surface-DEFAULT border border-background-border text-text-primary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                      required
                    >
                      <option value="">Select period...</option>
                      {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Genre *</label>
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full bg-surface-DEFAULT border border-background-border text-text-primary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                      required
                    >
                      <option value="">Select genre...</option>
                      {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this literary work, its significance, themes, and historical context..."
                rows={3}
                className="w-full bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 resize-none"
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Tags (up to 10)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Add tag and press Enter..."
                  className="flex-1 bg-surface-DEFAULT border border-background-border text-text-primary placeholder-text-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2.5 rounded-xl border border-background-border text-text-secondary hover:text-white transition-colors text-sm"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs"
                    >
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* License */}
            <div>
              <label className="block text-xs text-text-muted mb-1">License</label>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full bg-surface-DEFAULT border border-background-border text-text-primary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              >
                {licenses.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* File Dropzone */}
            <div>
              <label className="block text-xs text-text-muted mb-1">File (TXT or PDF, max 50MB) *</label>
              <div
                {...getRootProps()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-primary-500 bg-primary-500/5'
                    : file
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-background-border hover:border-primary-500/40'
                )}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-6 h-6 text-green-400" />
                    <div className="text-left">
                      <p className="text-text-primary text-sm font-medium">{file.name}</p>
                      <p className="text-text-muted text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="ml-auto p-1 rounded-lg text-text-muted hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <CloudUpload className={clsx('w-8 h-8 mx-auto mb-2', isDragActive ? 'text-primary-400' : 'text-text-muted')} />
                    <p className="text-text-secondary text-sm mb-1">
                      {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-text-muted text-xs">Supports .txt and .pdf files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div>
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>Uploading to IPFS...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-surface-DEFAULT rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="flex-1 py-3 rounded-xl border border-background-border text-text-secondary hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || uploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {uploading ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
                {uploading ? `Uploading ${progress}%` : 'Upload to Blockchain'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
