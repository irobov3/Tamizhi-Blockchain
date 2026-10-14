'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getWork, MOCK_WORKS } from '@/lib/api'
import type { LiteratureWork } from '@/lib/types'
import { formatGenre, genreColor, formatNumber, truncateHash, formatDate } from '@/lib/format'
import VerifiedBadge from '@/components/VerifiedBadge'
import NFTList from '@/components/NFTList'

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 'tamizhi-testnet-1'
const REST = process.env.NEXT_PUBLIC_REST_URL || 'http://localhost:1317'
const RPC = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:26657'
const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_BASE || 'http://localhost:3001'

declare global {
  interface Window {
    keplr?: {
      enable(chainId: string): Promise<void>
      getOfflineSigner(chainId: string): {
        getAccounts(): Promise<Array<{ address: string; pubkey: Uint8Array }>>;
      }
      experimentalSuggestChain(config: unknown): Promise<void>
    }
  }
}

interface NFTToken {
  token_id?: string
  tokenId?: string
  owner: string
  minted_at?: string
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        color: '#8a8aa0',
        marginBottom: '6px',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '15px', color: '#fdf6e3' }}>{children}</div>
    </div>
  )
}

export default function WorkDetailPage() {
  const { work_id } = useParams<{ work_id: string }>()

  const [work, setWork] = useState<LiteratureWork | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nfts] = useState<NFTToken[]>([])
  const [nftsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [keplrAddress, setKeplrAddress] = useState<string | null>(null)
  const [minting, setMinting] = useState(false)
  const [mintResult, setMintResult] = useState<{ txHash: string } | null>(null)
  const [mintError, setMintError] = useState<string | null>(null)
  const [relatedWorks, setRelatedWorks] = useState<LiteratureWork[]>([])

  useEffect(() => {
    if (!work_id) return
    setLoading(true)
    getWork(work_id)
      .then((w) => {
        setWork(w)
        setLoading(false)
        // Related: same genre or author
        const related = MOCK_WORKS.filter(
          (m) => m.id !== w.id && (m.genre === w.genre || m.author === w.author)
        ).slice(0, 3)
        setRelatedWorks(related)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [work_id])

  async function connectKeplr() {
    if (!window.keplr) {
      alert('Please install the Keplr wallet extension from https://www.keplr.app/')
      return null
    }
    try {
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
        currencies: [{ coinDenom: 'TMZ', coinMinimalDenom: 'utmz', coinDecimals: 6 }],
        feeCurrencies: [{
          coinDenom: 'TMZ', coinMinimalDenom: 'utmz', coinDecimals: 6,
          gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 },
        }],
        stakeCurrency: { coinDenom: 'TMZ', coinMinimalDenom: 'utmz', coinDecimals: 6 },
      })
      await window.keplr.enable(CHAIN_ID)
      const signer = window.keplr.getOfflineSigner(CHAIN_ID)
      const accounts = await signer.getAccounts()
      if (accounts[0]) {
        setKeplrAddress(accounts[0].address)
        return accounts[0].address
      }
      return null
    } catch (e) {
      console.error('Keplr error:', e)
      return null
    }
  }

  async function handleMintNFT() {
    if (!work) return
    let addr = keplrAddress
    if (!addr) {
      addr = await connectKeplr()
      if (!addr) return
    }
    setMinting(true)
    setMintError(null)
    try {
      if (!window.keplr) throw new Error('Keplr not available')
      const { SigningStargateClient } = await import('@cosmjs/stargate')
      const { Registry } = await import('@cosmjs/proto-signing')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = window.keplr.getOfflineSigner(CHAIN_ID) as any
      const client = await SigningStargateClient.connectWithSigner(RPC, signer, { registry: new Registry() })
      const msg = {
        typeUrl: '/tamizhi.nft.v1.MsgMintNFT',
        value: { creator: addr, workId: work.id },
      }
      const result = await client.signAndBroadcast(addr, [msg], {
        amount: [{ denom: 'utmz', amount: '5000' }],
        gas: '200000',
      }, '')
      if (result.code !== 0) throw new Error(`Tx failed: ${result.rawLog}`)
      setMintResult({ txHash: result.transactionHash })
    } catch (e: unknown) {
      setMintError(e instanceof Error ? e.message : 'Mint failed')
    } finally {
      setMinting(false)
    }
  }

  function copyTxHash() {
    if (!work?.txHash) return
    navigator.clipboard.writeText(work.txHash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Loading
  if (loading) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px' }}>
        {[240, 180, 140, 200].map((h, i) => (
          <div key={i} style={{
            height: `${h}px`,
            background: '#1a1040',
            borderRadius: '14px',
            marginBottom: '20px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
      </div>
    )
  }

  // Error
  if (error || !work) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '20px', opacity: 0.5 }}>📚</div>
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#fdf6e3' }}>Work not found</h1>
        <p style={{ color: '#8a8aa0', marginBottom: '28px' }}>
          {error ?? `No work with ID "${work_id}" could be found.`}
        </p>
        <Link href="/" style={{
          background: 'linear-gradient(135deg, #d4a017, #b8860b)',
          color: '#0a0618',
          padding: '12px 28px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '15px',
        }}>
          Back to Browse
        </Link>
      </div>
    )
  }

  const color = genreColor(work.genre)

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: '28px', fontSize: '13px', color: '#8a8aa0' }}>
        <Link href="/" style={{ color: '#d4a017' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none')}
        >
          Browse
        </Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{work.title}</span>
      </nav>

      {/* ── Title Hero ── */}
      <div style={{
        background: '#1a1040',
        border: '1px solid #2a1f5c',
        borderRadius: '16px',
        borderTop: `4px solid ${color}`,
        padding: '36px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Genre + Verified */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            background: `${color}18`,
            border: `1px solid ${color}40`,
            color,
            borderRadius: '7px',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 12px',
            letterSpacing: '0.04em',
          }}>
            {formatGenre(work.genre)}
          </span>
          <span style={{
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
            color: '#00d4ff',
            borderRadius: '7px',
            fontSize: '12px',
            fontWeight: 500,
            padding: '4px 12px',
          }}>
            {work.language === 'bilingual' ? 'Bilingual' : 'Tamil'}
          </span>
          {work.verified && <VerifiedBadge verifiedBy={work.verifiedBy} />}
        </div>

        {/* Tamil title */}
        {work.titleTamil && (
          <h1 style={{
            fontFamily: 'Noto Sans Tamil, serif',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            color: '#d4a017',
            margin: '0 0 10px',
            lineHeight: 1.2,
          }}>
            {work.titleTamil}
          </h1>
        )}

        {/* English title */}
        <h2 style={{
          fontSize: work.titleTamil ? '22px' : 'clamp(24px, 4vw, 40px)',
          fontWeight: work.titleTamil ? 500 : 700,
          color: '#fdf6e3',
          margin: '0 0 20px',
          opacity: work.titleTamil ? 0.75 : 1,
        }}>
          {work.title}
        </h2>

        {/* Author + Period */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="7" r="4" stroke="#8a8aa0" strokeWidth="1.5" />
              <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#8a8aa0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div>
              {work.authorTamil && (
                <span style={{
                  fontFamily: 'Noto Sans Tamil, serif',
                  fontSize: '17px',
                  color: '#fdf6e3',
                  marginRight: '8px',
                }}>
                  {work.authorTamil}
                </span>
              )}
              <span style={{ fontSize: '15px', color: '#8a8aa0' }}>{work.author}</span>
            </div>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(138,138,160,0.12)',
            border: '1px solid rgba(138,138,160,0.2)',
            color: '#8a8aa0',
            borderRadius: '6px',
            fontSize: '13px',
            padding: '4px 12px',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 4.5v4l2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {work.period}
          </span>
          {work.viewCount !== undefined && (
            <span style={{ fontSize: '13px', color: '#8a8aa0', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              {formatNumber(work.viewCount)} views
            </span>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      <div style={{
        background: '#1a1040',
        border: '1px solid #2a1f5c',
        borderRadius: '14px',
        padding: '28px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fdf6e3', marginBottom: '14px' }}>
          About this Work
        </h3>
        <p style={{ fontSize: '15px', color: '#8a8aa0', lineHeight: 1.8, margin: 0 }}>
          {work.description}
        </p>
      </div>

      {/* ── Tamil Excerpt ── */}
      {(work.excerptTamil || work.excerpt) && (
        <div style={{
          background: 'linear-gradient(135deg, #1a1040, #0e0824)',
          border: '1px solid #d4a01730',
          borderLeft: '4px solid #d4a017',
          borderRadius: '14px',
          padding: '28px 32px',
          marginBottom: '24px',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            fontSize: '40px',
            opacity: 0.06,
            color: '#d4a017',
            lineHeight: 1,
            userSelect: 'none',
          }}>
            ❝
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', color: '#d4a01780', marginBottom: '14px' }}>
            EXCERPT · மேற்கோள்
          </div>
          {work.excerptTamil && (
            <p style={{
              fontFamily: 'Noto Sans Tamil, serif',
              fontSize: '22px',
              color: '#d4a017',
              fontStyle: 'italic',
              lineHeight: 2,
              margin: '0 0 12px',
            }}>
              {work.excerptTamil}
            </p>
          )}
          {work.excerpt && (
            <p style={{
              fontSize: '15px',
              color: '#8a8aa0',
              fontStyle: 'italic',
              lineHeight: 1.7,
              margin: 0,
            }}>
              {work.excerpt}
            </p>
          )}
        </div>
      )}

      {/* ── Blockchain Info ── */}
      <div style={{
        background: '#1a1040',
        border: '1px solid #2a1f5c',
        borderRadius: '14px',
        padding: '28px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fdf6e3', marginBottom: '20px' }}>
          Blockchain Information
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}>
          <MetaField label="Work ID">
            <code style={{ fontSize: '13px', color: '#00d4ff', fontFamily: 'monospace' }}>
              {work.id}
            </code>
          </MetaField>

          {work.txHash && (
            <MetaField label="Transaction Hash">
              <code style={{ fontSize: '12px', color: '#00d4ff', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {truncateHash(work.txHash, 10, 8)}
              </code>
            </MetaField>
          )}

          {work.submitter && (
            <MetaField label="Submitted By">
              <code style={{ fontSize: '12px', color: '#8a8aa0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {truncateHash(work.submitter, 14, 8)}
              </code>
            </MetaField>
          )}

          {work.nftTokenId && (
            <MetaField label="NFT Token ID">
              <code style={{ fontSize: '13px', color: '#d4a017', fontFamily: 'monospace' }}>
                #{work.nftTokenId}
              </code>
            </MetaField>
          )}

          {work.createdAt && (
            <MetaField label="Submitted On">
              <span style={{ color: '#8a8aa0' }}>{formatDate(work.createdAt)}</span>
            </MetaField>
          )}
        </div>

        {/* Arweave */}
        {work.arweaveId && (
          <div style={{
            background: '#0e0824',
            border: '1px solid #2a1f5c',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '16px',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#8a8aa0', letterSpacing: '0.08em', marginBottom: '6px' }}>
                ARWEAVE PERMANENT STORAGE
              </div>
              <code style={{ fontSize: '13px', color: '#00d4ff', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {truncateHash(work.arweaveId, 16, 8)}
              </code>
            </div>
            <a
              href={`https://arweave.net/${work.arweaveId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                color: '#00d4ff',
                padding: '8px 16px',
                borderRadius: '7px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              View on Arweave ↗
            </a>
          </div>
        )}

        {/* Verify + Copy buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {work.txHash && (
            <>
              <a
                href={`${EXPLORER_BASE}/tx/${work.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #d4a017, #b8860b)',
                  color: '#0a0618',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                Verify on Chain ↗
              </a>
              <button
                onClick={copyTxHash}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: copied ? 'rgba(34,197,94,0.1)' : '#0e0824',
                  border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : '#2a1f5c'}`,
                  color: copied ? '#22c55e' : '#8a8aa0',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? '✓ Copied!' : 'Copy TX Hash'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── NFT Section ── */}
      <div style={{
        background: '#1a1040',
        border: '1px solid #2a1f5c',
        borderRadius: '14px',
        padding: '28px',
        marginBottom: '24px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fdf6e3', margin: 0 }}>
            NFT Ownership
            {nfts.length > 0 && (
              <span style={{
                marginLeft: '10px',
                background: 'rgba(212,160,23,0.15)',
                color: '#d4a017',
                padding: '2px 10px',
                borderRadius: '999px',
                fontSize: '13px',
              }}>
                {nfts.length}
              </span>
            )}
          </h3>

          {mintResult ? (
            <div style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600 }}>
              ✓ Minted! {truncateHash(mintResult.txHash, 8, 6)}
            </div>
          ) : (
            <button
              onClick={handleMintNFT}
              disabled={minting}
              style={{
                background: keplrAddress
                  ? 'linear-gradient(135deg, #d4a017, #b8860b)'
                  : 'rgba(212,160,23,0.15)',
                border: '1px solid rgba(212,160,23,0.4)',
                color: keplrAddress ? '#0a0618' : '#d4a017',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: minting ? 'wait' : 'pointer',
                opacity: minting ? 0.7 : 1,
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {minting ? 'Minting…' : keplrAddress ? 'Mint NFT' : 'Connect Keplr to Mint'}
            </button>
          )}
        </div>

        {mintError && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {mintError}
          </div>
        )}

        {keplrAddress && (
          <div style={{ fontSize: '12px', color: '#8a8aa0', marginBottom: '14px' }}>
            Connected:{' '}
            <code style={{ color: '#d4a017' }}>
              {truncateHash(keplrAddress, 14, 8)}
            </code>
          </div>
        )}

        <NFTList nfts={nfts} loading={nftsLoading} />
      </div>

      {/* ── Related Works ── */}
      {relatedWorks.length > 0 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fdf6e3', marginBottom: '20px' }}>
            Related Works
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}>
            {relatedWorks.map((rw) => {
              const rc = genreColor(rw.genre)
              return (
                <Link
                  key={rw.id}
                  href={`/works/${rw.id}`}
                  style={{
                    display: 'block',
                    background: '#1a1040',
                    border: '1px solid #2a1f5c',
                    borderTop: `3px solid ${rc}`,
                    borderRadius: '12px',
                    padding: '18px',
                    transition: 'transform 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.transform = 'translateY(-2px)'
                    el.style.borderColor = `${rc}60`
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.transform = 'translateY(0)'
                    el.style.borderColor = '#2a1f5c'
                  }}
                >
                  {rw.titleTamil && (
                    <div style={{
                      fontFamily: 'Noto Sans Tamil, serif',
                      fontSize: '18px',
                      color: '#d4a017',
                      marginBottom: '4px',
                    }}>
                      {rw.titleTamil}
                    </div>
                  )}
                  <div style={{ fontSize: '14px', color: '#fdf6e3', marginBottom: '6px' }}>
                    {rw.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8a8aa0' }}>
                    {rw.author} · {rw.period}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
