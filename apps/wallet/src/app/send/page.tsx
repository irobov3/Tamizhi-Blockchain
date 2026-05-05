'use client';

import React, { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import TxStatus, { type TxState } from '@/components/TxStatus';
import { coins } from '@cosmjs/stargate';

const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'http://localhost:3001';
const DENOM = 'utmz';
const TMZ_FACTOR = 1_000_000;

function tmzToUtmz(tmz: string): string {
  const val = parseFloat(tmz);
  if (isNaN(val) || val <= 0) return '0';
  return String(Math.floor(val * TMZ_FACTOR));
}

export default function SendPage() {
  const { address, balance, isConnected, client, refreshBalance } = useWallet();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!recipient.trim()) {
      errors.recipient = 'Recipient address is required.';
    } else if (!/^[a-z0-9]+$/.test(recipient.trim())) {
      errors.recipient = 'Invalid bech32 address format.';
    }
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) {
      errors.amount = 'Enter a valid amount greater than 0.';
    } else if (balance !== null && amtNum > parseFloat(balance)) {
      errors.amount = `Insufficient balance (you have ${parseFloat(balance).toFixed(4)} TMZ).`;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!client || !address) {
      setTxState({ status: 'error', message: 'Wallet not connected.' });
      return;
    }

    setTxState({ status: 'pending' });
    try {
      const utmzAmount = tmzToUtmz(amount);
      const result = await client.sendTokens(
        address,
        recipient.trim(),
        coins(utmzAmount, DENOM),
        'auto',
        memo.trim() || undefined,
      );

      if (result.code !== 0) {
        throw new Error(result.rawLog ?? `Transaction failed with code ${result.code}`);
      }

      setTxState({ status: 'success', txHash: result.transactionHash });
      setRecipient('');
      setAmount('');
      setMemo('');
      await refreshBalance();
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
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔗</div>
              <p>Connect your wallet to send TMZ.</p>
            </div>
          ) : (
            <form onSubmit={handleSend} noValidate>
              {/* From */}
              <div style={styles.field}>
                <label style={styles.label}>From</label>
                <div style={styles.readonlyInput}>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{address}</span>
                </div>
                {balance !== null && (
                  <div style={styles.hint}>
                    Balance: <strong style={{ color: '#f5a623' }}>{parseFloat(balance).toFixed(4)} TMZ</strong>
                  </div>
                )}
              </div>

              {/* Recipient */}
              <div style={styles.field}>
                <label style={styles.label} htmlFor="recipient">
                  Recipient Address <span style={{ color: '#ef5350' }}>*</span>
                </label>
                <input
                  id="recipient"
                  style={{
                    ...styles.input,
                    ...(fieldErrors.recipient ? styles.inputError : {}),
                  }}
                  type="text"
                  placeholder="tamizi1..."
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setFieldErrors((p) => ({ ...p, recipient: '' }));
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {fieldErrors.recipient && (
                  <div style={styles.errorText}>{fieldErrors.recipient}</div>
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
                    style={{
                      ...styles.input,
                      paddingRight: '60px',
                      ...(fieldErrors.amount ? styles.inputError : {}),
                    }}
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
                    = {tmzToUtmz(amount)} utmz
                  </div>
                )}
                {fieldErrors.amount && (
                  <div style={styles.errorText}>{fieldErrors.amount}</div>
                )}
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
                  placeholder="Optional transaction memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={256}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                style={{
                  ...styles.sendButton,
                  ...(txState.status === 'pending' ? styles.sendButtonDisabled : {}),
                }}
                disabled={txState.status === 'pending'}
              >
                {txState.status === 'pending' ? 'Sending…' : 'Send TMZ →'}
              </button>

              <TxStatus state={txState} explorerUrl={EXPLORER_URL} />
            </form>
          )}
        </div>

        {/* Info panel */}
        <div style={styles.infoPanel}>
          <h3 style={styles.infoPanelTitle}>About Sending</h3>
          <ul style={styles.infoList}>
            <li>Amounts are entered in TMZ (1 TMZ = 1,000,000 utmz)</li>
            <li>Gas fees are estimated automatically</li>
            <li>Transactions are irreversible once confirmed</li>
            <li>Memos are stored on-chain and publicly visible</li>
            <li>Chain ID: <code style={styles.inlineCode}>tamizhi-testnet-1</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: '28px' },
  h1: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#fdf6e3',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '14px',
    color: 'rgba(253,246,227,0.5)',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: '24px',
    alignItems: 'start',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(245,166,35,0.18)',
    borderRadius: '14px',
    padding: '28px',
  },
  connectPrompt: {
    textAlign: 'center',
    color: 'rgba(253,246,227,0.5)',
    padding: '40px 0',
    fontSize: '15px',
  },
  field: { marginBottom: '20px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(253,246,227,0.7)',
    marginBottom: '6px',
    letterSpacing: '0.02em',
  },
  readonlyInput: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(245,166,35,0.12)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fdf6e3',
    wordBreak: 'break-all',
    fontSize: '13px',
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(245,166,35,0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fdf6e3',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  inputError: {
    borderColor: '#ef5350',
  },
  inputWrapper: { position: 'relative' },
  inputSuffix: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(253,246,227,0.4)',
    fontSize: '13px',
    pointerEvents: 'none',
  },
  hint: {
    fontSize: '12px',
    color: 'rgba(253,246,227,0.45)',
    marginTop: '4px',
  },
  errorText: {
    fontSize: '12px',
    color: '#ef5350',
    marginTop: '4px',
  },
  sendButton: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #f5a623, #e08c10)',
    border: 'none',
    borderRadius: '8px',
    color: '#1a1040',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontFamily: 'inherit',
    marginTop: '4px',
  },
  sendButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  infoPanel: {
    background: 'rgba(245,166,35,0.06)',
    border: '1px solid rgba(245,166,35,0.15)',
    borderRadius: '12px',
    padding: '20px 22px',
  },
  infoPanelTitle: {
    margin: '0 0 14px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#f5a623',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  infoList: {
    margin: 0,
    padding: '0 0 0 18px',
    color: 'rgba(253,246,227,0.6)',
    fontSize: '13px',
    lineHeight: 1.8,
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: '12px',
    background: 'rgba(255,255,255,0.08)',
    padding: '1px 5px',
    borderRadius: '3px',
  },
};
