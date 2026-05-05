'use client';

import React from 'react';

export type TxState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; txHash: string }
  | { status: 'error'; message: string };

interface TxStatusProps {
  state: TxState;
  explorerUrl?: string;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '16px',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  pending: {
    background: 'rgba(245,166,35,0.12)',
    border: '1px solid rgba(245,166,35,0.35)',
    color: '#f5a623',
  },
  success: {
    background: 'rgba(76,175,80,0.12)',
    border: '1px solid rgba(76,175,80,0.35)',
    color: '#4caf50',
  },
  error: {
    background: 'rgba(239,83,80,0.12)',
    border: '1px solid rgba(239,83,80,0.35)',
    color: '#ef5350',
  },
  hashLink: {
    color: '#4caf50',
    textDecoration: 'underline',
    wordBreak: 'break-all' as const,
    fontSize: '12px',
    display: 'block',
    marginTop: '4px',
  },
  spinner: {
    display: 'inline-block',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2.5px solid rgba(245,166,35,0.3)',
    borderTopColor: '#f5a623',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  icon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  textBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
};

export default function TxStatus({ state, explorerUrl }: TxStatusProps) {
  if (state.status === 'idle') return null;

  if (state.status === 'pending') {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ ...styles.container, ...styles.pending }}>
          <div style={styles.spinner} />
          <span>Broadcasting transaction…</span>
        </div>
      </>
    );
  }

  if (state.status === 'success') {
    const explorerLink = explorerUrl
      ? `${explorerUrl}/tx/${state.txHash}`
      : null;
    return (
      <div style={{ ...styles.container, ...styles.success }}>
        <span style={styles.icon}>✅</span>
        <div style={styles.textBlock}>
          <span>Transaction confirmed!</span>
          {explorerLink ? (
            <a
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.hashLink}
            >
              {state.txHash}
            </a>
          ) : (
            <span style={{ ...styles.hashLink, textDecoration: 'none' }}>
              {state.txHash}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={{ ...styles.container, ...styles.error }}>
        <span style={styles.icon}>❌</span>
        <span>{state.message}</span>
      </div>
    );
  }

  return null;
}
