'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { isValidContentHash } from '@/lib/format';
import type { WorkType } from '@/lib/types';

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 'tamizhi-testnet-1';
const REST     = process.env.NEXT_PUBLIC_REST_URL  || 'http://localhost:1317';
const RPC      = process.env.NEXT_PUBLIC_RPC_URL   || 'http://localhost:26657';

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

interface FormFields {
  titleTamil: string;
  titleEnglish: string;
  author: string;
  workType: WorkType | '';
  language: string;
  century: string;
  contentHash: string;
  arweaveId: string;
}

const INITIAL: FormFields = {
  titleTamil: '',
  titleEnglish: '',
  author: '',
  workType: '',
  language: 'Tamil',
  century: '',
  contentHash: '',
  arweaveId: '',
};

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'poem',    label: 'Poem (கவிதை)' },
  { value: 'prose',   label: 'Prose (உரைநடை)' },
  { value: 'epic',    label: 'Epic (காவியம்)' },
  { value: 'grammar', label: 'Grammar (இலக்கணம்)' },
];

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#4a3520',
  marginBottom: '6px',
  letterSpacing: '0.02em',
};

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '2px solid #e8e0d0',
  borderRadius: '8px',
  fontSize: '15px',
  color: '#2d1b00',
  background: '#fff',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const ERROR_TEXT: React.CSSProperties = {
  fontSize: '12px',
  color: '#c0392b',
  marginTop: '4px',
};

function FieldGroup({
  label,
  required,
  children,
  hint,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={LABEL}>
        {label}
        {required && <span style={{ color: '#c0392b', marginLeft: '4px' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: '12px', color: '#9b8469', marginTop: '4px' }}>{hint}</p>
      )}
      {error && <p style={ERROR_TEXT}>{error}</p>}
    </div>
  );
}

export default function SubmitPage() {
  const [fields, setFields] = useState<FormFields>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [keplrAddress, setKeplrAddress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ workId: string; txHash: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set(key: keyof FormFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormFields, string>> = {};

    if (!fields.titleTamil.trim())  newErrors.titleTamil = 'Tamil title is required.';
    if (!fields.titleEnglish.trim()) newErrors.titleEnglish = 'English transliteration is required.';
    if (!fields.author.trim())       newErrors.author = 'Author name is required.';
    if (!fields.workType)            newErrors.workType = 'Please select a work type.';
    if (!fields.language.trim())     newErrors.language = 'Language is required.';
    if (!fields.century.trim())      newErrors.century = 'Century/Era is required.';

    if (!fields.contentHash.trim()) {
      newErrors.contentHash = 'Content hash is required.';
    } else if (!isValidContentHash(fields.contentHash)) {
      newErrors.contentHash = 'Content hash must be exactly 64 hexadecimal characters.';
    }

    if (fields.arweaveId && !/^[a-zA-Z0-9_-]{43}$/.test(fields.arweaveId)) {
      newErrors.arweaveId = 'Arweave ID should be 43 base64url characters (or leave blank).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function connectKeplr() {
    if (!window.keplr) {
      alert('Please install the Keplr wallet extension from https://www.keplr.app/');
      return false;
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
        currencies: [{ coinDenom: 'TMZH', coinMinimalDenom: 'utmzh', coinDecimals: 6 }],
        feeCurrencies: [{ coinDenom: 'TMZH', coinMinimalDenom: 'utmzh', coinDecimals: 6, gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 } }],
        stakeCurrency: { coinDenom: 'TMZH', coinMinimalDenom: 'utmzh', coinDecimals: 6 },
      });
      await window.keplr.enable(CHAIN_ID);
      const signer = window.keplr.getOfflineSigner(CHAIN_ID);
      const accounts = await signer.getAccounts();
      if (accounts[0]) {
        setKeplrAddress(accounts[0].address);
        return accounts[0].address;
      }
      return false;
    } catch (e) {
      console.error('Keplr error:', e);
      return false;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);

    // Ensure Keplr is connected
    let address = keplrAddress;
    if (!address) {
      const result = await connectKeplr();
      if (!result) {
        setSubmitError('Please connect Keplr to sign the transaction.');
        return;
      }
      address = result as string;
    }

    setSubmitting(true);
    try {
      if (!window.keplr) throw new Error('Keplr not available');

      const { SigningStargateClient } = await import('@cosmjs/stargate');
      const { Registry } = await import('@cosmjs/proto-signing');

      const signer = window.keplr.getOfflineSigner(CHAIN_ID);
      const registry = new Registry();

      const client = await SigningStargateClient.connectWithSigner(RPC, signer, { registry });

      const msg = {
        typeUrl: '/tamizhi.literature.v1.MsgSubmitWork',
        value: {
          creator: address,
          title: fields.titleTamil,
          titleTransliteration: fields.titleEnglish,
          author: fields.author,
          workType: fields.workType,
          language: fields.language,
          century: fields.century,
          contentHash: fields.contentHash,
          arweaveId: fields.arweaveId || '',
        },
      };

      const fee = {
        amount: [{ denom: 'utmzh', amount: '10000' }],
        gas: '300000',
      };

      const result = await client.signAndBroadcast(address, [msg], fee, '');
      if (result.code !== 0) throw new Error(`Transaction failed: ${result.rawLog}`);

      // Extract work ID from logs (if present) or derive from tx hash
      const workId = fields.contentHash.slice(0, 12);
      setSuccess({ workId, txHash: result.transactionHash });
      setFields(INITIAL);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ──
  if (success) {
    return (
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '64px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            background: '#dcfce7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 24px',
          }}
        >
          ✓
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#2d1b00', marginBottom: '12px' }}>
          Work Submitted Successfully!
        </h1>
        <p style={{ color: '#7a6545', marginBottom: '24px' }}>
          Your literary work has been broadcast to the Tamizhi blockchain and will appear
          in the browser once the transaction is confirmed.
        </p>

        <div
          style={{
            background: '#f5f0e8',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '28px',
            textAlign: 'left',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#9b8469', marginBottom: '4px' }}>Work ID (derived)</div>
            <code style={{ fontSize: '13px', wordBreak: 'break-all' }}>{success.workId}</code>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#9b8469', marginBottom: '4px' }}>Transaction Hash</div>
            <code style={{ fontSize: '13px', wordBreak: 'break-all' }}>{success.txHash}</code>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href={`/works/${success.workId}`}
            style={{
              background: '#c0392b',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View Work →
          </Link>
          <button
            onClick={() => setSuccess(null)}
            style={{
              background: '#fff',
              color: '#2d1b00',
              border: '2px solid #e8e0d0',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 64px' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2d1b00', marginBottom: '8px' }}>
          Submit a Literary Work
        </h1>
        <p style={{ color: '#7a6545', fontSize: '15px' }}>
          Preserve a Tamil literary work on the Tamizhi blockchain. You&apos;ll need the content
          hash (SHA-256 of the text) and a Keplr wallet to sign the transaction.
        </p>
      </div>

      {/* Keplr status bar */}
      <div
        style={{
          background: keplrAddress ? '#dcfce7' : '#fef3c7',
          border: `1px solid ${keplrAddress ? '#86efac' : '#fcd34d'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '13px',
              color: keplrAddress ? '#15803d' : '#92400e',
              fontWeight: 600,
            }}
          >
            {keplrAddress ? 'Keplr connected' : 'Keplr not connected'}
          </span>
          {keplrAddress && (
            <span style={{ fontSize: '12px', color: '#4a3520', marginLeft: '8px' }}>
              {keplrAddress.slice(0, 14)}…{keplrAddress.slice(-8)}
            </span>
          )}
        </div>
        {!keplrAddress && (
          <button
            type="button"
            onClick={connectKeplr}
            style={{
              background: '#f39c12',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Connect Keplr
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Title (Tamil) */}
        <FieldGroup
          label="Title (Tamil)"
          required
          error={errors.titleTamil}
          hint="Enter the title in Tamil script, e.g. திருக்குறள்"
        >
          <input
            type="text"
            value={fields.titleTamil}
            onChange={(e) => set('titleTamil', e.target.value)}
            style={{
              ...INPUT,
              fontFamily: 'Noto Sans Tamil, serif',
              fontSize: '17px',
              borderColor: errors.titleTamil ? '#c0392b' : '#e8e0d0',
            }}
            placeholder="திருக்குறள்"
            lang="ta"
            dir="auto"
            onFocus={(e) => !errors.titleTamil && ((e.target as HTMLInputElement).style.borderColor = '#c0392b')}
            onBlur={(e) => !errors.titleTamil && ((e.target as HTMLInputElement).style.borderColor = '#e8e0d0')}
          />
        </FieldGroup>

        {/* Title (English) */}
        <FieldGroup
          label="Title (English Transliteration)"
          required
          error={errors.titleEnglish}
          hint="Romanised transliteration for search and accessibility"
        >
          <input
            type="text"
            value={fields.titleEnglish}
            onChange={(e) => set('titleEnglish', e.target.value)}
            style={{ ...INPUT, borderColor: errors.titleEnglish ? '#c0392b' : '#e8e0d0' }}
            placeholder="Thirukkural"
            onFocus={(e) => !errors.titleEnglish && ((e.target as HTMLInputElement).style.borderColor = '#c0392b')}
            onBlur={(e) => !errors.titleEnglish && ((e.target as HTMLInputElement).style.borderColor = '#e8e0d0')}
          />
        </FieldGroup>

        {/* Author */}
        <FieldGroup label="Author" required error={errors.author}>
          <input
            type="text"
            value={fields.author}
            onChange={(e) => set('author', e.target.value)}
            style={{ ...INPUT, borderColor: errors.author ? '#c0392b' : '#e8e0d0' }}
            placeholder="Thiruvalluvar"
            onFocus={(e) => !errors.author && ((e.target as HTMLInputElement).style.borderColor = '#c0392b')}
            onBlur={(e) => !errors.author && ((e.target as HTMLInputElement).style.borderColor = '#e8e0d0')}
          />
        </FieldGroup>

        {/* Work type + Language (2-col) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}
        >
          <FieldGroup label="Work Type" required error={errors.workType}>
            <select
              value={fields.workType}
              onChange={(e) => set('workType', e.target.value)}
              style={{ ...INPUT, borderColor: errors.workType ? '#c0392b' : '#e8e0d0', cursor: 'pointer' }}
            >
              <option value="">Select type…</option>
              {WORK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Language" required error={errors.language}>
            <input
              type="text"
              value={fields.language}
              onChange={(e) => set('language', e.target.value)}
              style={{ ...INPUT, borderColor: errors.language ? '#c0392b' : '#e8e0d0' }}
              placeholder="Tamil"
            />
          </FieldGroup>
        </div>

        {/* Century/Era */}
        <FieldGroup
          label="Century / Era"
          required
          error={errors.century}
          hint='e.g. "1st century BCE", "Sangam period", "Medieval"'
        >
          <input
            type="text"
            value={fields.century}
            onChange={(e) => set('century', e.target.value)}
            style={{ ...INPUT, borderColor: errors.century ? '#c0392b' : '#e8e0d0' }}
            placeholder="3rd century BCE"
            onFocus={(e) => !errors.century && ((e.target as HTMLInputElement).style.borderColor = '#c0392b')}
            onBlur={(e) => !errors.century && ((e.target as HTMLInputElement).style.borderColor = '#e8e0d0')}
          />
        </FieldGroup>

        {/* Content hash */}
        <FieldGroup
          label="Content Hash"
          required
          error={errors.contentHash}
          hint="SHA-256 hash of the work's text content — must be exactly 64 hexadecimal characters"
        >
          <input
            type="text"
            value={fields.contentHash}
            onChange={(e) => set('contentHash', e.target.value.toLowerCase())}
            style={{
              ...INPUT,
              fontFamily: 'monospace',
              letterSpacing: '0.03em',
              borderColor: errors.contentHash
                ? '#c0392b'
                : fields.contentHash && isValidContentHash(fields.contentHash)
                ? '#15803d'
                : '#e8e0d0',
            }}
            placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            maxLength={64}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
          />
          {fields.contentHash && !errors.contentHash && (
            <p
              style={{
                fontSize: '12px',
                marginTop: '4px',
                color: isValidContentHash(fields.contentHash) ? '#15803d' : '#9b8469',
              }}
            >
              {fields.contentHash.length}/64 characters
              {isValidContentHash(fields.contentHash) ? ' ✓ valid' : ''}
            </p>
          )}
        </FieldGroup>

        {/* Arweave ID (optional) */}
        <FieldGroup
          label="Arweave ID (optional)"
          error={errors.arweaveId}
          hint="43-character Arweave transaction ID if the work is stored on Arweave"
        >
          <input
            type="text"
            value={fields.arweaveId}
            onChange={(e) => set('arweaveId', e.target.value)}
            style={{ ...INPUT, fontFamily: 'monospace', borderColor: errors.arweaveId ? '#c0392b' : '#e8e0d0' }}
            placeholder="AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdE"
            maxLength={43}
            spellCheck={false}
          />
        </FieldGroup>

        {/* Submit error */}
        {submitError && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '14px 18px',
              marginBottom: '20px',
              color: '#991b1b',
              fontSize: '14px',
            }}
          >
            <strong>Submission failed:</strong> {submitError}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            background: submitting ? '#9b8469' : '#c0392b',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: submitting ? 'wait' : 'pointer',
            transition: 'background 0.2s',
            letterSpacing: '0.02em',
          }}
        >
          {submitting ? 'Broadcasting transaction…' : 'Submit to Tamizhi Blockchain →'}
        </button>

        <p
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#9b8469',
            marginTop: '16px',
          }}
        >
          Submitting will open a Keplr signing prompt. A small fee in TMZH is required.
        </p>
      </form>
    </div>
  );
}
