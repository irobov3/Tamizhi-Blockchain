'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import type { SubmitWorkForm } from '@/lib/types'

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 'tamizhi-testnet-1'
const REST = process.env.NEXT_PUBLIC_REST_URL || 'http://localhost:1317'
const RPC = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:26657'

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

const GENRES = [
  { value: 'poetry',     label: 'Poetry',     labelTamil: 'கவிதை' },
  { value: 'epic',       label: 'Epic',        labelTamil: 'காவியம்' },
  { value: 'grammar',    label: 'Grammar',     labelTamil: 'இலக்கணம்' },
  { value: 'philosophy', label: 'Philosophy',  labelTamil: 'தத்துவம்' },
  { value: 'history',    label: 'History',     labelTamil: 'வரலாறு' },
  { value: 'other',      label: 'Other',       labelTamil: 'மற்றவை' },
]

const STEPS = ['Work Details', 'Content', 'Submit to Chain']

const INITIAL_FORM: SubmitWorkForm = {
  title: '',
  titleTamil: '',
  author: '',
  period: '',
  genre: '',
  description: '',
  content: '',
  language: 'tamil',
}

// Client-side SHA-256
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #2a1f5c',
  borderRadius: '10px',
  fontSize: '15px',
  color: '#fdf6e3',
  background: '#0e0824',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

function FieldGroup({
  label,
  labelTamil,
  required,
  children,
  hint,
  error,
}: {
  label: string
  labelTamil?: string
  required?: boolean
  children: React.ReactNode
  hint?: string
  error?: string
}) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: 600,
        color: '#fdf6e3',
        marginBottom: '8px',
        letterSpacing: '0.03em',
      }}>
        {label}
        {labelTamil && (
          <span style={{
            fontFamily: 'Noto Sans Tamil, serif',
            fontSize: '15px',
            color: '#d4a017',
            marginLeft: '8px',
            fontWeight: 400,
          }}>
            {labelTamil}
          </span>
        )}
        {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: '12px', color: '#8a8aa0', marginTop: '6px' }}>{hint}</p>
      )}
      {error && (
        <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{error}</p>
      )}
    </div>
  )
}

export default function SubmitPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<SubmitWorkForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof SubmitWorkForm | 'general', string>>>({})
  const [contentHash, setContentHash] = useState<string | null>(null)
  const [hashLoading, setHashLoading] = useState(false)
  const [keplrAddress, setKeplrAddress] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ txHash: string; workId: string } | null>(null)

  function set(key: keyof SubmitWorkForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function styledInput(key: keyof SubmitWorkForm, extra?: React.CSSProperties) {
    return {
      ...INPUT,
      ...(extra ?? {}),
      borderColor: errors[key] ? '#ef4444' : '#2a1f5c',
    }
  }

  function focusInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = '#d4a017'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, key: keyof SubmitWorkForm) {
    e.currentTarget.style.borderColor = errors[key] ? '#ef4444' : '#2a1f5c'
    e.currentTarget.style.boxShadow = 'none'
  }

  function validateStep1(): boolean {
    const newErrors: typeof errors = {}
    if (!form.title.trim()) newErrors.title = 'Title is required'
    if (!form.author.trim()) newErrors.author = 'Author is required'
    if (!form.period.trim()) newErrors.period = 'Period is required (e.g. "300 BC")'
    if (!form.genre) newErrors.genre = 'Please select a genre'
    if (!form.description.trim()) newErrors.description = 'Description is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function validateStep2(): boolean {
    const newErrors: typeof errors = {}
    if (!form.content.trim() || form.content.trim().split(/\s+/).length < 5) {
      newErrors.content = 'Please enter at least a few words of content'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function goToStep2() {
    if (!validateStep1()) return
    setStep(1)
  }

  async function goToStep3() {
    if (!validateStep2()) return
    setHashLoading(true)
    const hash = await sha256(form.content)
    setContentHash(hash)
    setHashLoading(false)
    setStep(2)
  }

  async function connectKeplr(): Promise<string | null> {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})

    let addr = keplrAddress
    if (!addr) {
      addr = await connectKeplr()
      if (!addr) return
    }

    setSubmitting(true)
    try {
      if (!window.keplr) throw new Error('Keplr not available')
      const { SigningStargateClient } = await import('@cosmjs/stargate')
      const { Registry } = await import('@cosmjs/proto-signing')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = window.keplr.getOfflineSigner(CHAIN_ID) as any
      const client = await SigningStargateClient.connectWithSigner(RPC, signer, { registry: new Registry() })

      const msg = {
        typeUrl: '/tamizhi.literature.v1.MsgSubmitWork',
        value: {
          creator: addr,
          title: form.title,
          titleTamil: form.titleTamil || '',
          author: form.author,
          period: form.period,
          genre: form.genre,
          language: form.language,
          description: form.description,
          contentHash: contentHash ?? '',
        },
      }

      const result = await client.signAndBroadcast(addr, [msg], {
        amount: [{ denom: 'utmz', amount: '2000' }],
        gas: '300000',
      }, '')

      if (result.code !== 0) throw new Error(`Transaction failed: ${result.rawLog}`)

      // Derive a work ID from the hash
      const workId = (contentHash ?? '').slice(0, 16)
      setSuccess({ txHash: result.transactionHash, workId })
      setForm(INITIAL_FORM)
      setContentHash(null)
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : 'Submission failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Success
  if (success) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'rgba(34,197,94,0.12)',
          border: '2px solid rgba(34,197,94,0.4)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          margin: '0 auto 28px',
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fdf6e3', marginBottom: '12px' }}>
          Work Submitted!
        </h1>
        <p style={{ color: '#8a8aa0', marginBottom: '32px', lineHeight: 1.7 }}>
          Your literary work has been broadcast to the Tamizhi blockchain.
          It will appear in the browser once the transaction is confirmed.
        </p>

        <div style={{
          background: '#1a1040',
          border: '1px solid #2a1f5c',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '28px',
          textAlign: 'left',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#8a8aa0', letterSpacing: '0.08em', marginBottom: '6px' }}>
              WORK ID
            </div>
            <code style={{ fontSize: '13px', color: '#00d4ff', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {success.workId}
            </code>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#8a8aa0', letterSpacing: '0.08em', marginBottom: '6px' }}>
              TRANSACTION HASH
            </div>
            <code style={{ fontSize: '13px', color: '#d4a017', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {success.txHash}
            </code>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={`/works/${success.workId}`} style={{
            background: 'linear-gradient(135deg, #d4a017, #b8860b)',
            color: '#0a0618',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '15px',
          }}>
            View Work →
          </Link>
          <button
            onClick={() => setSuccess(null)}
            style={{
              background: '#1a1040',
              color: '#fdf6e3',
              border: '1px solid #2a1f5c',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '15px',
              fontFamily: 'inherit',
            }}
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <p style={{
          fontFamily: 'Noto Sans Tamil, serif',
          fontSize: '16px',
          color: '#d4a017',
          marginBottom: '10px',
        }}>
          சமர்ப்பிக்கவும்
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fdf6e3', marginBottom: '8px' }}>
          Submit a Literary Work
        </h1>
        <p style={{ color: '#8a8aa0', fontSize: '15px' }}>
          Preserve a Tamil literary work on the Tamizhi blockchain. A small fee of
          0.002 TMZ is required to sign the transaction with your Keplr wallet.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '36px',
        gap: '0',
      }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: i < step
                  ? 'rgba(34,197,94,0.2)'
                  : i === step
                  ? 'rgba(212,160,23,0.2)'
                  : 'rgba(138,138,160,0.1)',
                border: `2px solid ${i < step ? '#22c55e' : i === step ? '#d4a017' : '#2a1f5c'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: i < step ? '#22c55e' : i === step ? '#d4a017' : '#8a8aa0',
                flexShrink: 0,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: i === step ? 600 : 400,
                color: i === step ? '#fdf6e3' : '#8a8aa0',
                whiteSpace: 'nowrap',
              }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: '1px',
                background: i < step ? '#22c55e30' : '#2a1f5c',
                margin: '0 12px',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Work Details ── */}
      {step === 0 && (
        <div style={{
          background: '#1a1040',
          border: '1px solid #2a1f5c',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fdf6e3', marginBottom: '24px' }}>
            Work Details
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <FieldGroup label="Title (English)" required error={errors.title}>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  style={styledInput('title')}
                  placeholder="e.g. Thirukkural"
                  onFocus={focusInput}
                  onBlur={(e) => blurInput(e, 'title')}
                />
              </FieldGroup>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <FieldGroup label="Title in Tamil" labelTamil="தமிழ் தலைப்பு" error={errors.titleTamil}
                hint="Optional: enter the title in Tamil script">
                <input
                  type="text"
                  value={form.titleTamil}
                  onChange={(e) => set('titleTamil', e.target.value)}
                  style={{ ...styledInput('titleTamil'), fontFamily: 'Noto Sans Tamil, serif', fontSize: '18px' }}
                  placeholder="திருக்குறள்"
                  lang="ta"
                  onFocus={focusInput}
                  onBlur={(e) => blurInput(e, 'titleTamil')}
                />
              </FieldGroup>
            </div>

            <FieldGroup label="Author" required error={errors.author}>
              <input
                type="text"
                value={form.author}
                onChange={(e) => set('author', e.target.value)}
                style={styledInput('author')}
                placeholder="e.g. Thiruvalluvar"
                onFocus={focusInput}
                onBlur={(e) => blurInput(e, 'author')}
              />
            </FieldGroup>

            <FieldGroup label="Period" required error={errors.period} hint='e.g. "300 BC" or "12th century AD"'>
              <input
                type="text"
                value={form.period}
                onChange={(e) => set('period', e.target.value)}
                style={styledInput('period')}
                placeholder="300 BC"
                onFocus={focusInput}
                onBlur={(e) => blurInput(e, 'period')}
              />
            </FieldGroup>

            <FieldGroup label="Genre" required error={errors.genre}>
              <select
                value={form.genre}
                onChange={(e) => set('genre', e.target.value)}
                style={{ ...styledInput('genre'), cursor: 'pointer' }}
                onFocus={focusInput}
                onBlur={(e) => blurInput(e, 'genre')}
              >
                <option value="">Select genre…</option>
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label} ({g.labelTamil})
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="Language" required error={errors.language}>
              <select
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
                style={{ ...styledInput('language'), cursor: 'pointer' }}
                onFocus={focusInput}
                onBlur={(e) => blurInput(e, 'language')}
              >
                <option value="tamil">Tamil (தமிழ்)</option>
                <option value="bilingual">Bilingual (இரு மொழி)</option>
              </select>
            </FieldGroup>

            <div style={{ gridColumn: '1 / -1' }}>
              <FieldGroup label="Description" required error={errors.description}
                hint="A brief description of the work (2-3 sentences)">
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  style={{
                    ...styledInput('description'),
                    minHeight: '100px',
                    resize: 'vertical',
                    lineHeight: 1.7,
                  } as React.CSSProperties}
                  placeholder="Brief description of the work…"
                  onFocus={focusInput}
                  onBlur={(e) => blurInput(e, 'description')}
                />
              </FieldGroup>
            </div>
          </div>

          <button
            onClick={goToStep2}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #d4a017, #b8860b)',
              color: '#0a0618',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginTop: '8px',
            }}
          >
            Continue to Content →
          </button>
        </div>
      )}

      {/* ── STEP 2: Content ── */}
      {step === 1 && (
        <div style={{
          background: '#1a1040',
          border: '1px solid #2a1f5c',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fdf6e3', marginBottom: '8px' }}>
            Work Content
          </h2>
          <p style={{ fontSize: '14px', color: '#8a8aa0', marginBottom: '24px' }}>
            Enter the full text of the work. A SHA-256 hash will be computed client-side
            and stored on-chain as proof of authenticity.
          </p>

          <FieldGroup label="Full Text" required error={errors.content}
            hint="Paste or type the complete text of the work">
            <textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              style={{
                ...styledInput('content'),
                minHeight: '300px',
                resize: 'vertical',
                lineHeight: 1.8,
                fontFamily: 'Noto Sans Tamil, serif',
                fontSize: '16px',
              } as React.CSSProperties}
              placeholder="அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு…"
              lang="ta"
              onFocus={focusInput}
              onBlur={(e) => blurInput(e, 'content')}
            />
          </FieldGroup>

          {/* Word count */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#8a8aa0',
          }}>
            <span>
              {form.content.trim() ? form.content.trim().split(/\s+/).length : 0} words
              {' · '}
              {new Blob([form.content]).size.toLocaleString()} bytes
            </span>
            {form.content && (
              <span style={{ color: '#22c55e' }}>Content ready for hashing</span>
            )}
          </div>

          {/* Hash preview info */}
          <div style={{
            background: '#0e0824',
            border: '1px solid #2a1f5c',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
          }}>
            <div style={{ fontSize: '11px', color: '#8a8aa0', letterSpacing: '0.08em', marginBottom: '8px' }}>
              CONTENT HASH PREVIEW (SHA-256 — computed on submit)
            </div>
            <code style={{ fontSize: '12px', color: '#8a8aa0', fontFamily: 'monospace', opacity: 0.6 }}>
              Will be computed from the content above…
            </code>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setStep(0)}
              style={{
                flex: '0 0 auto',
                background: 'transparent',
                color: '#8a8aa0',
                border: '1px solid #2a1f5c',
                borderRadius: '10px',
                padding: '14px 24px',
                fontSize: '15px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ← Back
            </button>
            <button
              onClick={goToStep3}
              disabled={hashLoading}
              style={{
                flex: 1,
                background: hashLoading ? 'rgba(212,160,23,0.3)' : 'linear-gradient(135deg, #d4a017, #b8860b)',
                color: '#0a0618',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: hashLoading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {hashLoading ? 'Computing hash…' : 'Preview & Submit →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Blockchain Submission ── */}
      {step === 2 && (
        <form onSubmit={handleSubmit}>
          <div style={{
            background: '#1a1040',
            border: '1px solid #2a1f5c',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fdf6e3', marginBottom: '8px' }}>
              Submit to Blockchain
            </h2>
            <p style={{ fontSize: '14px', color: '#8a8aa0', marginBottom: '28px' }}>
              Review the details below and sign with your Keplr wallet to submit permanently.
            </p>

            {/* Summary card */}
            <div style={{
              background: '#0e0824',
              border: '1px solid #2a1f5c',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'TITLE', value: form.titleTamil ? `${form.titleTamil} (${form.title})` : form.title },
                  { label: 'AUTHOR', value: form.author },
                  { label: 'PERIOD', value: form.period },
                  { label: 'GENRE', value: form.genre },
                  { label: 'LANGUAGE', value: form.language },
                  { label: 'CONTENT SIZE', value: `${new Blob([form.content]).size.toLocaleString()} bytes` },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: '10px', color: '#8a8aa0', letterSpacing: '0.1em', marginBottom: '4px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '14px', color: '#fdf6e3' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content hash */}
            {contentHash && (
              <div style={{
                background: '#0e0824',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: '10px',
                padding: '16px 20px',
                marginBottom: '24px',
              }}>
                <div style={{ fontSize: '11px', color: '#8a8aa0', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  CONTENT HASH (SHA-256)
                </div>
                <code style={{
                  fontSize: '12px',
                  color: '#00d4ff',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  lineHeight: 1.8,
                }}>
                  {contentHash}
                </code>
              </div>
            )}

            {/* Fee info */}
            <div style={{
              background: 'rgba(212,160,23,0.06)',
              border: '1px solid rgba(212,160,23,0.2)',
              borderRadius: '10px',
              padding: '14px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '20px' }}>⛽</span>
              <div>
                <div style={{ fontSize: '14px', color: '#fdf6e3', fontWeight: 600 }}>
                  Estimated fee: 0.002 TMZ
                </div>
                <div style={{ fontSize: '12px', color: '#8a8aa0' }}>
                  Gas: 300,000 units · You will be prompted to confirm in Keplr
                </div>
              </div>
            </div>

            {/* Wallet status */}
            <div style={{
              background: keplrAddress ? 'rgba(34,197,94,0.08)' : 'rgba(138,138,160,0.06)',
              border: `1px solid ${keplrAddress ? 'rgba(34,197,94,0.25)' : '#2a1f5c'}`,
              borderRadius: '10px',
              padding: '14px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <div>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: keplrAddress ? '#22c55e' : '#8a8aa0',
                }}>
                  {keplrAddress ? '● Keplr Connected' : '○ Keplr not connected'}
                </span>
                {keplrAddress && (
                  <code style={{ fontSize: '12px', color: '#8a8aa0', marginLeft: '10px' }}>
                    {keplrAddress.slice(0, 16)}…{keplrAddress.slice(-8)}
                  </code>
                )}
              </div>
              {!keplrAddress && (
                <button
                  type="button"
                  onClick={connectKeplr}
                  style={{
                    background: 'rgba(212,160,23,0.15)',
                    border: '1px solid rgba(212,160,23,0.4)',
                    color: '#d4a017',
                    borderRadius: '7px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Connect Keplr Wallet
                </button>
              )}
            </div>

            {/* General error */}
            {errors.general && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '20px',
                color: '#ef4444',
                fontSize: '14px',
              }}>
                <strong>Submission failed:</strong> {errors.general}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: '0 0 auto',
                  background: 'transparent',
                  color: '#8a8aa0',
                  border: '1px solid #2a1f5c',
                  borderRadius: '10px',
                  padding: '14px 24px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 1,
                  background: submitting ? 'rgba(212,160,23,0.3)' : 'linear-gradient(135deg, #d4a017, #b8860b)',
                  color: '#0a0618',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Broadcasting to chain…' : 'Submit to Tamizhi Blockchain →'}
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#8a8aa0', marginTop: '16px' }}>
              Submitting will open a Keplr signing prompt. The transaction is permanent and cannot be undone.
            </p>
          </div>
        </form>
      )}
    </div>
  )
}
