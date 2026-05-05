'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getWork, getNFTsForWork } from '@/lib/api';
import type { LiteraryWork, NFTToken } from '@/lib/types';
import WorkBadge from '@/components/WorkBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import NFTList from '@/components/NFTList';
import { truncateHash, formatEra } from '@/lib/format';

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 'tamizhi-testnet-1';
const REST = process.env.NEXT_PUBLIC_REST_URL || 'http://localhost:1317';
const RPC  = process.env.NEXT_PUBLIC_RPC_URL  || 'http://localhost:26657';

// ── Keplr types (minimal) ──
declare global {
  interface Window {
    keplr?: {
      enable(chainId: string): Promise<void>;
      getOfflineSigner(chainId: string): {
        getAccounts(): Promise<Array<{ address: string; pubkey: Uint8Array }>>;
      };
      experimentalSuggestChain(config: unknown): Promise<void>;
    };
  }
}

const SECTION_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e0d0',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#9b8469',
  marginBottom: '4px',
};

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={LABEL_STYLE}>{label}</div>
      <div style={{ fontSize: '15px', color: '#2d1b00' }}>{value}</div>
    </div>
  );
}

export default function WorkDetailPage() {
  const { work_id } = useParams<{ work_id: string }>();

  const [work, setWork] = useState<LiteraryWork | null>(null);
  const [nfts, setNfts] = useState<NFTToken[]>([]);
  const [loadingWork, setLoadingWork] = useState(true);
  const [loadingNfts, setLoadingNfts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [keplrAddress, setKeplrAddress] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ txHash: string } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  useEffect(() => {
    if (!work_id) return;
    setLoadingWork(true);
    getWork(work_id)
      .then((w) => { setWork(w); setLoadingWork(false); })
      .catch((e) => { setError(e.message); setLoadingWork(false); });

    setLoadingNfts(true);
    getNFTsForWork(work_id)
      .then((n) => { setNfts(n); setLoadingNfts(false); })
      .catch(() => { setLoadingNfts(false); });
  }, [work_id]);

  function copyHash() {
    if (!work?.content_hash) return;
    navigator.clipboard.writeText(work.content_hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const connectKeplr = useCallback(async () => {
    if (!window.keplr) {
      alert('Keplr wallet extension is not installed. Please install it from https://www.keplr.app/');
      return;
    }
    try {
      // Suggest the Tamizhi chain config if not already added
      await window.keplr.experimentalSuggestChain({
        chainId: CHAIN_ID,
        chainName: 'Tamizhi Testnet',
        rpc: RPC,
        rest: REST,
        bip44: { coinType: 118 },
        bech32Config: {
          bech32PrefixAccAddr: 'tamizhi',
          bech32PrefixAccPub: 'tamizhipub',
          bech32PrefixValAddr: 'tamizhivaloper',
          bech32PrefixValPub: 'tamizhivaloperpub',
          bech32PrefixConsAddr: 'tamizhivalcons',
          bech32PrefixConsPub: 'tamizhivalconspub',
        },
        currencies: [{ coinDenom: 'TMZH', coinMinimalDenom: 'utmzh', coinDecimals: 6 }],
        feeCurrencies: [{ coinDenom: 'TMZH', coinMinimalDenom: 'utmzh', coinDecimals: 6, gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 } }],
        stakeCurrency: { coinDenom: 'TMZH', coinMinimalDenom: 'utmzh', coinDecimals: 6 },
      });
      await window.keplr.enable(CHAIN_ID);
      const signer = window.keplr.getOfflineSigner(CHAIN_ID);
      const accounts = await signer.getAccounts();
      if (accounts[0]) setKeplrAddress(accounts[0].address);
    } catch (e: unknown) {
      console.error('Keplr connect error:', e);
    }
  }, []);

  async function handleMintNFT() {
    if (!keplrAddress) {
      await connectKeplr();
      return;
    }
    if (!work) return;
    setMinting(true);
    setMintError(null);

    try {
      if (!window.keplr) throw new Error('Keplr not available');
      const { SigningStargateClient } = await import('@cosmjs/stargate');
      const { Registry } = await import('@cosmjs/proto-signing');

      const signer = window.keplr.getOfflineSigner(CHAIN_ID);
      const registry = new Registry();

      const client = await SigningStargateClient.connectWithSigner(RPC, signer, { registry });

      const msg = {
        typeUrl: '/tamizhi.nft.v1.MsgMintNFT',
        value: {
          creator: keplrAddress,
          workId: work.work_id,
        },
      };

      const fee = {
        amount: [{ denom: 'utmzh', amount: '5000' }],
        gas: '200000',
      };

      const result = await client.signAndBroadcast(keplrAddress, [msg], fee, '');
      if (result.code !== 0) throw new Error(`Tx failed: ${result.rawLog}`);
      setMintResult({ txHash: result.transactionHash });

      // Refresh NFT list
      getNFTsForWork(work.work_id).then(setNfts).catch(() => undefined);
    } catch (e: unknown) {
      setMintError(e instanceof Error ? e.message : 'Mint failed');
    } finally {
      setMinting(false);
    }
  }

  // ── Loading state ──
  if (loadingWork) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[200, 120, 160].map((h, i) => (
            <div
              key={i}
              style={{
                height: `${h}px`,
                background: '#f0e8d8',
                borderRadius: '12px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  // ── Error state ──
  if (error || !work) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
        <h1 style={{ fontSize: '24px', marginBottom: '8px', color: '#2d1b00' }}>Work not found</h1>
        <p style={{ color: '#7a6545', marginBottom: '24px' }}>
          {error ?? `No work exists with ID "${work_id}".`}
        </p>
        <Link
          href="/"
          style={{
            background: '#c0392b',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 64px' }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: '24px', fontSize: '13px', color: '#9b8469' }} aria-label="Breadcrumb">
        <Link href="/" style={{ color: '#c0392b', textDecoration: 'none' }}>Browse</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{work.title}</span>
      </nav>

      {/* ── Title section ── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
          <WorkBadge type={work.work_type} />
          {work.verified && <VerifiedBadge />}
        </div>
        <h1
          style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontFamily: 'Noto Sans Tamil, serif',
            color: '#2d1b00',
            lineHeight: 1.3,
            margin: '0 0 8px',
          }}
        >
          {work.title}
        </h1>
        {work.title_transliteration && (
          <p style={{ fontSize: '18px', color: '#7a6545', fontStyle: 'italic', margin: 0 }}>
            {work.title_transliteration}
          </p>
        )}
      </div>

      {/* ── Metadata ── */}
      <div style={SECTION_STYLE}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#2d1b00', marginBottom: '20px' }}>
          Work Metadata
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 32px' }}>
          <MetaRow label="Author" value={work.author} />
          <MetaRow label="Language" value={work.language} />
          <MetaRow label="Era" value={formatEra(work.century, work.era)} />
          <MetaRow label="Work ID" value={<code style={{ fontSize: '13px' }}>{work.work_id}</code>} />
          {work.submitter && <MetaRow label="Submitted by" value={
            <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{work.submitter}</code>
          } />}
        </div>
      </div>

      {/* ── Content hash ── */}
      <div style={SECTION_STYLE}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#2d1b00', marginBottom: '16px' }}>
          Content Hash
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#f5f0e8',
            padding: '14px 16px',
            borderRadius: '8px',
            flexWrap: 'wrap',
          }}
        >
          <code
            style={{
              fontSize: '14px',
              color: '#4a3520',
              fontFamily: 'monospace',
              flex: 1,
              wordBreak: 'break-all',
            }}
          >
            {truncateHash(work.content_hash, 12, 12)}
          </code>
          <button
            onClick={copyHash}
            style={{
              background: copied ? '#dcfce7' : '#fff',
              color: copied ? '#15803d' : '#c0392b',
              border: `1px solid ${copied ? '#86efac' : '#c0392b'}`,
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? 'Copied!' : 'Copy hash'}
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#9b8469', marginTop: '8px' }}>
          SHA-256 content hash of the literary work stored immutably on Tamizhi blockchain.
        </p>
      </div>

      {/* ── Arweave ── */}
      {work.arweave_id && (
        <div style={SECTION_STYLE}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#2d1b00', marginBottom: '12px' }}>
            Permanent Storage
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                background: '#f5f0e8',
                padding: '10px 16px',
                borderRadius: '8px',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '20px' }}>🌐</span>
              <div>
                <div style={{ fontSize: '12px', color: '#9b8469', marginBottom: '2px' }}>Arweave ID</div>
                <code style={{ fontSize: '13px', wordBreak: 'break-all' }}>
                  {truncateHash(work.arweave_id, 16, 8)}
                </code>
              </div>
            </div>
            <a
              href={`https://arweave.net/${work.arweave_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#c0392b',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              View on Arweave ↗
            </a>
          </div>
        </div>
      )}

      {/* ── On-chain verification ── */}
      <div style={SECTION_STYLE}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#2d1b00', marginBottom: '16px' }}>
          On-Chain Verification
        </h2>
        {work.verified ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  background: '#dcfce7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <div>
                <div style={{ fontWeight: 600, color: '#15803d' }}>Verified on Tamizhi blockchain</div>
                <div style={{ fontSize: '13px', color: '#7a6545' }}>
                  This work has been cryptographically verified and is permanently stored.
                </div>
              </div>
            </div>
            {work.block_height && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#f5f0e8', padding: '12px', borderRadius: '8px' }}>
                  <div style={LABEL_STYLE}>Block Height</div>
                  <code style={{ fontSize: '14px' }}>#{work.block_height.toLocaleString()}</code>
                </div>
                {work.tx_hash && (
                  <div style={{ background: '#f5f0e8', padding: '12px', borderRadius: '8px' }}>
                    <div style={LABEL_STYLE}>Transaction</div>
                    <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                      {truncateHash(work.tx_hash, 10, 8)}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#92400e',
              background: '#fef3c7',
              padding: '14px 18px',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: '20px' }}>⏳</span>
            <span>This work is pending on-chain verification.</span>
          </div>
        )}
      </div>

      {/* ── NFT Ownership ── */}
      <div style={SECTION_STYLE}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#2d1b00' }}>
            NFT Ownership
            {nfts.length > 0 && (
              <span
                style={{
                  marginLeft: '10px',
                  background: '#f5f0e8',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#7a6545',
                }}
              >
                {nfts.length}
              </span>
            )}
          </h2>

          {/* Mint button */}
          {mintResult ? (
            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: 600 }}>
              Minted! Tx: {truncateHash(mintResult.txHash, 8, 6)}
            </div>
          ) : (
            <button
              onClick={handleMintNFT}
              disabled={minting}
              style={{
                background: keplrAddress ? '#c0392b' : '#f39c12',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: minting ? 'wait' : 'pointer',
                opacity: minting ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {minting
                ? 'Minting…'
                : keplrAddress
                ? 'Mint NFT'
                : 'Connect Keplr to Mint'}
            </button>
          )}
        </div>

        {mintError && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {mintError}
          </div>
        )}

        {keplrAddress && (
          <div style={{ fontSize: '12px', color: '#9b8469', marginBottom: '12px' }}>
            Connected: <code>{truncateHash(keplrAddress, 12, 8)}</code>
          </div>
        )}

        <NFTList nfts={nfts} loading={loadingNfts} />
      </div>
    </div>
  );
}
