'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { isKeplrAvailable } from '@/lib/keplr';

function truncateAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 9)}...${addr.slice(-6)}`;
}

export default function WalletButton() {
  const { address, balanceUtmz, isConnected, isLoading, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  }

  // Not installed
  if (!isKeplrAvailable() && !isConnected) {
    return (
      <a
        href="https://www.keplr.app"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.installBtn}
      >
        Install Keplr
      </a>
    );
  }

  // Connected — show address + dropdown
  if (isConnected && address) {
    const balTMZ = (parseInt(balanceUtmz, 10) / 1_000_000).toFixed(2);
    return (
      <div style={{ position: 'relative' }} ref={dropRef}>
        <button
          style={styles.connectedBtn}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span style={styles.dot} />
          <span>{truncateAddress(address)}</span>
          <span style={styles.balancePill}>{balTMZ} TMZ</span>
          <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
        </button>

        {open && (
          <div style={styles.dropdown}>
            <div style={styles.dropAddr}>{address}</div>
            <div style={styles.dropDivider} />
            <button style={styles.dropItem} onClick={copyAddress}>
              {copied ? '✓ Copied!' : 'Copy Address'}
            </button>
            <button
              style={{ ...styles.dropItem, color: '#ef5350' }}
              onClick={() => { disconnect(); setOpen(false); }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Disconnected — connect button
  return (
    <button
      style={{
        ...styles.connectBtn,
        ...(isLoading ? styles.connectBtnDisabled : {}),
      }}
      onClick={connect}
      disabled={isLoading}
    >
      {isLoading ? 'Connecting…' : 'Connect Keplr'}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  connectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #6b3fa0, #3b1f7a)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  connectBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  installBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 18px',
    borderRadius: '8px',
    border: '1.5px solid rgba(107,63,160,0.6)',
    background: 'transparent',
    color: 'rgba(253,246,227,0.7)',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  connectedBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 14px',
    borderRadius: '8px',
    border: '1.5px solid rgba(245,166,35,0.4)',
    background: 'rgba(245,166,35,0.1)',
    color: '#f5a623',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4caf50',
    flexShrink: 0,
  },
  balancePill: {
    fontSize: '12px',
    color: '#fdf6e3',
    fontWeight: 400,
    borderLeft: '1px solid rgba(245,166,35,0.35)',
    paddingLeft: '8px',
    marginLeft: '2px',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: '280px',
    background: '#1a1040',
    border: '1px solid rgba(245,166,35,0.25)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: 200,
    overflow: 'hidden',
  },
  dropAddr: {
    padding: '12px 16px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: 'rgba(253,246,227,0.5)',
    wordBreak: 'break-all',
    lineHeight: 1.5,
  },
  dropDivider: {
    height: '1px',
    background: 'rgba(245,166,35,0.12)',
    margin: '0',
  },
  dropItem: {
    display: 'block',
    width: '100%',
    padding: '11px 16px',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    color: 'rgba(253,246,227,0.75)',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
};
