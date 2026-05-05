'use client';

import React from 'react';
import { useWallet } from '@/hooks/useWallet';

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 9)}...${addr.slice(-6)}`;
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 18px',
    borderRadius: '8px',
    border: '1.5px solid #f5a623',
    background: 'transparent',
    color: '#f5a623',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  buttonConnected: {
    background: 'rgba(245, 166, 35, 0.12)',
    color: '#f5a623',
  },
  buttonConnecting: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4caf50',
    display: 'inline-block',
    flexShrink: 0,
  },
  balance: {
    color: '#fdf6e3',
    fontWeight: 400,
    fontSize: '12px',
    borderLeft: '1px solid rgba(245,166,35,0.4)',
    paddingLeft: '8px',
    marginLeft: '2px',
  },
  disconnectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '1px solid rgba(245,166,35,0.5)',
    background: 'transparent',
    color: '#f5a623',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1,
    padding: 0,
    marginLeft: '4px',
    fontFamily: 'inherit',
  },
  wrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
};

export default function WalletButton() {
  const { address, balance, isConnected, isConnecting, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <div style={styles.wrapper}>
        <div style={{ ...styles.button, ...styles.buttonConnected }}>
          <span style={styles.dot} />
          <span>{truncateAddress(address)}</span>
          {balance !== null && (
            <span style={styles.balance}>{parseFloat(balance).toFixed(2)} TMZ</span>
          )}
        </div>
        <button
          style={styles.disconnectBtn}
          onClick={disconnect}
          title="Disconnect wallet"
          aria-label="Disconnect wallet"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      style={{
        ...styles.button,
        ...(isConnecting ? styles.buttonConnecting : {}),
      }}
      onClick={connect}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <span style={{ fontSize: '12px' }}>⏳</span>
          Connecting…
        </>
      ) : (
        <>
          <span style={{ fontSize: '14px' }}>🔗</span>
          Connect Keplr
        </>
      )}
    </button>
  );
}
