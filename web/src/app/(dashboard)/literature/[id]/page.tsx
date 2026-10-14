'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ExternalLink,
  Shield,
  Copy,
  Check,
  BookOpen,
  Calendar,
  Tag,
  User,
  Link2,
  Sparkles,
  Download,
} from 'lucide-react';
import { getLiteratureById } from '@/lib/api';
import { mintWorkKeplr, isKeplrAvailable } from '@/lib/chain';
import { useWalletStore } from '@/store/wallet.store';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export default function LiteratureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [copied, setCopied] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ txHash: string } | null>(null);
  const [mintError, setMintError] = useState('');
  const { walletAddress, isConnected } = useWalletStore();

  const { data: work, isLoading, error } = useQuery({
    queryKey: ['literature', id],
    queryFn: async () => {
      const res = await getLiteratureById(id);
      return res.data;
    },
    placeholderData: {
      id,
      titleTamil: 'திருக்குறள்',
      titleTransliterated: 'Thirukkural',
      titleEnglish: 'Thirukkural',
      author: 'Thiruvalluvar',
      period: 'Post-Sangam (300–600 CE)',
      genre: 'Philosophy',
      ipfsCid: 'QmYourCIDHere1',
      isVerified: true,
      txHash: '0xabc123def456789abc123def456789abc123def456789abc123def456789abcd',
      blockHeight: 142587,
      timestamp: '2024-01-15T10:30:00Z',
      tags: ['ethics', 'philosophy', 'ancient'],
      language: 'Tamil',
      license: 'Public Domain',
      description:
        'Thirukkural is a classic Tamil language text consisting of 1,330 short couplets, or kurals, of seven words each. This text is considered one of the greatest works ever written on ethics and morality.',
      content: `அகர முதல எழுத்தெல்லாம் ஆதி
பகவன் முதற்றே உலகு.

கற்றதனால் ஆய பயனென்கொல் வாலறிவன்
நற்றாள் தொழாஅர் எனின்.

மலர்மிசை ஏகினான் மாணடி சேர்ந்தார்
நிலமிசை நீடுவாழ் வார்.`,
      uploaderAddress: 'tamizhi1qxy5z8mzl6s9jk2pv4w3bfdn7rtg0cd42v8k',
      fileSize: '2.4 MB',
      fileType: 'text/plain',
    },
  });

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleMintNFT = async () => {
    if (!isConnected || !walletAddress) {
      setMintError('Connect your wallet first.');
      return;
    }
    if (!isKeplrAvailable()) {
      setMintError('Keplr extension required to mint NFTs.');
      return;
    }
    if (!work) return;

    setMinting(true);
    setMintError('');
    setMintResult(null);
    try {
      const tokenId = `${work.id}-${Date.now()}`;
      const result = await mintWorkKeplr({
        sender: walletAddress,
        tokenId,
        titleTamil: work.titleTamil ?? work.titleEnglish,
        titleEnglish: work.titleEnglish,
        author: work.author,
        ipfsCid: work.ipfsCid,
        contentHash: work.txHash ?? tokenId,
        license: work.license ?? 'Public Domain',
        genre: work.genre,
        period: work.period,
        description: work.description,
      });
      setMintResult({ txHash: result.txHash });
    } catch (err) {
      setMintError(err instanceof Error ? err.message : 'Mint failed. Try again.');
    } finally {
      setMinting(false);
    }
  };

  const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-muted">Failed to load work. Please try again.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary-400 hover:text-primary-300">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Literature
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-background-card border border-background-border"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white tamil-text mb-1">{work.titleTamil}</h1>
                <p className="text-xl text-text-secondary mb-1">{work.titleTransliterated}</p>
                {work.titleEnglish !== work.titleTransliterated && (
                  <p className="text-text-muted text-sm">{work.titleEnglish}</p>
                )}
              </div>
              {work.isVerified && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Verified</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="primary">{work.genre}</Badge>
              <Badge variant="secondary">{work.period}</Badge>
              {work.tags?.map((tag: string) => (
                <Badge key={tag} variant="default">#{tag}</Badge>
              ))}
            </div>

            <p className="text-text-secondary leading-relaxed">{work.description}</p>
          </motion.div>

          {/* Content Viewer */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-background-card border border-background-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-400" />
                Content Preview
              </h2>
              <a
                href={`${ipfsGateway}/${work.ipfsCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                <Download className="w-4 h-4" />
                Full Text
              </a>
            </div>
            <pre className="tamil-text text-text-secondary text-base leading-loose whitespace-pre-wrap font-normal">
              {work.content}
            </pre>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Author Info */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-5 rounded-2xl bg-background-card border border-background-border"
          >
            <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Author
            </h3>
            <div className="text-white font-semibold">{work.author}</div>
            <div className="text-text-muted text-sm mt-1">{work.language}</div>
          </motion.div>

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl bg-background-card border border-background-border space-y-4"
          >
            <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Period</span>
                <span className="text-text-primary text-right max-w-[60%]">{work.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Genre</span>
                <span className="text-text-primary">{work.genre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">License</span>
                <span className="text-text-primary">{work.license}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">File Size</span>
                <span className="text-text-primary">{work.fileSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Block Height</span>
                <span className="text-text-primary font-mono">#{work.blockHeight?.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          {/* Chain Proof */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl bg-background-card border border-background-border"
          >
            <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Chain Proof
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-text-muted text-xs mb-1">IPFS CID</div>
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-mono text-xs truncate flex-1">
                    {work.ipfsCid}
                  </span>
                  <button
                    onClick={() => copyToClipboard(work.ipfsCid, 'cid')}
                    className="text-text-muted hover:text-white transition-colors flex-shrink-0"
                  >
                    {copied === 'cid' ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Tx Hash</div>
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-mono text-xs truncate flex-1">
                    {work.txHash?.slice(0, 20)}...
                  </span>
                  <button
                    onClick={() => copyToClipboard(work.txHash, 'hash')}
                    className="text-text-muted hover:text-white transition-colors flex-shrink-0"
                  >
                    {copied === 'hash' ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <a
                  href={`${ipfsGateway}/${work.ipfsCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                >
                  <Link2 className="w-3 h-3" />
                  IPFS
                </a>
                <a
                  href={`/explorer?tx=${work.txHash}`}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  Explorer
                </a>
              </div>
            </div>
          </motion.div>

          {/* NFT Mint Button */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Button
              onClick={handleMintNFT}
              loading={minting}
              fullWidth
              className="flex items-center justify-center gap-2"
              disabled={minting || !!mintResult}
            >
              <Sparkles className="w-4 h-4" />
              {minting ? 'Minting...' : mintResult ? 'Minted!' : 'Mint as NFT'}
            </Button>

            {mintResult && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-400 text-xs font-semibold mb-1">NFT minted successfully!</p>
                <p className="text-green-400/70 text-xs font-mono break-all">{mintResult.txHash}</p>
              </div>
            )}

            {mintError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-xs">{mintError}</p>
              </div>
            )}

            {!mintResult && (
              <p className="text-xs text-text-muted text-center">
                {isConnected ? 'Create an NFT proof on the Tamizhi chain' : 'Connect wallet to mint'}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
