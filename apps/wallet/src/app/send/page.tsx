'use client';

import React, { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import TxStatus, { type TxState } from '@/components/TxStatus';
import { sendTokens } from '@/lib/keplr';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://explorer.tamizhi.ai';
const TMZ_FACTOR = 1_000_000;
const FEE_TMZ = 0.002;

function tmzToUtmz(tmz: string): string {
  const val = parseFloat(tmz);
  if (isNaN(val) || val <= 0) return '0';
  return String(Math.floor(val * TMZ_FACTOR));
}

function isValidTamizhiAddr(addr: string): boolean {
  return /^tamizhi1[a-z0-9]{38,}$/.test(addr.trim());
}

export default function SendPage() {
  const { address, balance, isConnected, refresh } = useWallet();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!recipient.trim()) {
      errors.recipient = 'Recipient address is required.';
    } else if (!isValidTamizhiAddr(recipient)) {
      errors.recipient = 'Address must start with "tamizhi1" followed by lowercase alphanumeric characters.';
    }

    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) {
      errors.amount = 'Enter a valid amount greater than 0.';
    } else if (amtNum + FEE_TMZ > parseFloat(balance)) {
      errors.amount = `Insufficient balance. You have ${parseFloat(balance).toFixed(4)} TMZ (fee: ${FEE_TMZ} TMZ).`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!address) {
      setTxState({ status: 'error', message: 'Wallet not connected.' });
      return;
    }

    setTxState({ status: 'pending' });
    try {
      const utmzAmount = tmzToUtmz(amount);
      const txHash = await sendTokens(address, recipient.trim(), utmzAmount, memo.trim() || undefined);
      setTxState({ status: 'success', txHash });
      setRecipient('');
      setAmount('');
      setMemo('');
      await refresh();
    } catch (err: any) {
      setTxState({
        status: 'error',
        message: err?.message ?? 'Transaction failed. Please try again.',
      });
    }
  }

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.h1}>Send TMZ</h1>
        <p style={styles.subtitle}>Transfer TMZ tokens to any Tamizhi address.</p>
      </div>

      <div style={styles.layout}>
        {/* Send form */}
        <div style={styles.card}>
          {!isConnected ? (
            <div style={styles.connectPrompt}>
              <div style={{ fontSize: '40px', marginBottom: '14px' }}>🔗</div>
              <p style={{ margin: 0, color: 'rgba(253,246,227,0.5)', fontSize: '15px' }}>
                Connect your wallet to send TMZ.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSend} noValidate>
              {/* From */}
              <div style={styles.field}>
                <label style={styles.label}>From</label>
                <div style={styles.readonlyInput}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                    {address}
                  </span>
                </div>
                <div style={styles.hint}>
                  Balance: <strong style={{ color: '#d4a017' }}>{parseFloat(balance).toFixed(4)} TMZ</strong>
                </div>
              </div>

              {/* Recipient */}
              <div style={styles.field}>
                <label style={styles.label} htmlFor="recipient">
                  Recipient Address <span style={{ color: '#ef5350' }}>*</span>
                </label>
                <input
                  id="recipient"
                  style={{ ...styles.input, ...(fieldErrors.recipient ? styles.inputError : {}) }}
                  type="text"
                  placeholder="tamizhi1..."
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setFieldErrors((p) => ({ ...p, recipient: '' }));
                    if (txState.status !== 'idle') setTxState({ status: 'idle' });
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {fieldErrors.recipient && <div style={styles.errorText}>{fieldErrors.recipient}</div>}
                {recipient && !fieldErrors.recipient && isValidTamizhiAddr(recipient) && (
                  <div style={{ ...styles.hint, color: '#4caf50' }}>Valid Tamizhi address</div>
                )}
              </div>

              {/* Amount */}
              <div style={styles.field}>
                <label style={styles.label} htmlFor="amount">
                  Amount (TMZ) <span style={{ color: '#ef5350' }}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    id="amount"
                    style={{ ...styles.input, paddingRight: '56px', ...(fieldErrors.amount ? styles.inputError : {}) }}
                    type="number"
                    placeholder="0.000000"
                    min="0"
                    step="0.000001"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setFieldErrors((p) => ({ ...p, amount: '' }));
                    }}
                  />
                  <span style={styles.inputSuffix}>TMZ</span>
                </div>
                {amount && !isNaN(parseFloat(amount)) && (
                  <div style={styles.hint}>
                    = {tmzToUtmz(amount)} utmz &nbsp;·&nbsp; Fee: ~{FEE_TMZ} TMZ
                  </div>
                )}
                {fieldErrors.amount && <div style={styles.errorText}>{fieldErrors.amount}</div>}
              </div>

              {/* Memo */}
              <div style={styles.field}>
                <label style={styles.label} htmlFor="memo">
                  Memo <span style={{ color: 'rgba(253,246,227,0.35)' }}>(optional)</span>
                </label>
                <input
                  id="memo"
                  style={styles.input}
                  type="text"
                  placeholder="Optional on-chain memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={256}
                />
              </div>

              {/* Fee estimate */}
              <div style={styles.feeRow}>
                <span style={{ color: 'rgba(253,246,227,0.5)', fontSize: '13px' }}>Estimated fee</span>
                <span style={{ color: '#d4a017', fontWeight: 600, fontSize: '13px' }}>{FEE_TMZ} TMZ</span>
              </div>

              <button
                type="submit"
                style={{ ...styles.sendBtn, ...(txState.status === 'pending' ? styles.sendBtnDisabled : {}) }}
                disabled={txState.status === 'pending'}
              >
                {txState.status === 'pending' ? 'Sending…' : 'Send TMZ →'}
              </button>

              <TxStatus state={txState} explorerUrl={EXPLORER} />
            </form>
          )}
        </div>

        {/* Info panel */}
        <div style={styles.infoPanel}>
          <h3 style={styles.infoPanelTitle}>Notes</h3>
          <ul style={styles.infoList}>
            <li>1 TMZ = 1,000,000 utmz</li>
            <li>Addresses start with <code style={styles.code}>tamizhi1</code></li>
            <li>Transactions are irreversible</li>
            <li>Memos are public on-chain</li>
            <li>Gas is estimated automatically</li>
            <li>Chain: <code style={styles.code}>tamizhi-testnet-1</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: '28px' },
  h1: { margin: 0, fontSize: '28px', fontWeight: 700, color: '#fdf6e3', letterSpacing: '-0.02em' },
  subtitle: { margin: '6px 0 0', fontSize: '14px', color: 'rgba(253,246,227,0.5)' },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gap: '24px',
    alignItems: 'start',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(42,31,92,0.8)',
    borderRadius: '14px',
    padding: '28px',
  },
  connectPrompt: {
    textAlign: 'center',
    padding: '48px 0',
  },
  field: { marginBottom: '20px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(253,246,227,0.7)',
    marginBottom: '6px',
  },
  readonlyInput: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(42,31,92,0.6)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fdf6e3',
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(42,31,92,0.8)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fdf6e3',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  inputError: { borderColor: '#ef5350' },
  inputWrapper: { position: 'relative' },
  inputSuffix: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(253,246,227,0.35)',
    fontSize: '13px',
    pointerEvents: 'none',
  },
  hint: { fontSize: '12px', color: 'rgba(253,246,227,0.45)', marginTop: '5px' },
  errorText: { fontSize: '12px', color: '#ef5350', marginTop: '5px' },
  feeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'rgba(212,160,23,0.06)',
    border: '1px solid rgba(212,160,23,0.15)',
    borderRadius: '8px',
    marginBottom: '18px',
  },
  sendBtn: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #d4a017, #b8870e)',
    border: 'none',
    borderRadius: '8px',
    color: '#0e0824',
    fontWeight: 800,
    fontSize: '15px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  sendBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  infoPanel: {
    background: 'rgba(212,160,23,0.06)',
    border: '1px solid rgba(212,160,23,0.15)',
    borderRadius: '12px',
    padding: '20px',
  },
  infoPanelTitle: {
    margin: '0 0 12px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#d4a017',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  infoList: {
    margin: 0,
    padding: '0 0 0 18px',
    color: 'rgba(253,246,227,0.6)',
    fontSize: '13px',
    lineHeight: 2,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '12px',
    background: 'rgba(255,255,255,0.08)',
    padding: '1px 5px',
    borderRadius: '3px',
  },
};
