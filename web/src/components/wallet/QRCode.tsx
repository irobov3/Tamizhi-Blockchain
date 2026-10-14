'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, Download } from 'lucide-react';

interface QRCodeDisplayProps {
  address: string;
}

export function QRCodeDisplay({ address }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Tamizhi Wallet Address',
          text: `Send TMZ to my wallet: ${address}`,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // User cancelled or share failed, fall back to copy
        await copyAddress();
      }
    } else {
      await copyAddress();
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('wallet-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `tamizhi-wallet-${address.slice(-8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const shortAddress = `${address.slice(0, 14)}...${address.slice(-8)}`;

  return (
    <div className="w-full max-w-sm">
      <div className="bg-background-card border border-background-border rounded-2xl p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-1">Receive TMZ</h3>
        <p className="tamil-text text-primary-400 text-sm mb-6">TMZ பெறுக</p>

        {/* QR Code */}
        <div className="inline-flex p-4 bg-white rounded-2xl mb-6">
          <QRCodeSVG
            id="wallet-qr-code"
            value={address}
            size={200}
            level="M"
            includeMargin={false}
            fgColor="#1A1A2E"
            bgColor="#FFFFFF"
            imageSettings={{
              src: '/icon-32.png',
              x: undefined,
              y: undefined,
              height: 32,
              width: 32,
              excavate: true,
            }}
          />
        </div>

        {/* Address Display */}
        <div className="bg-surface-DEFAULT border border-background-border rounded-xl p-3 mb-4">
          <p className="text-text-muted text-xs mb-1">Wallet Address</p>
          <p className="text-text-primary font-mono text-sm break-all">{address}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={copyAddress}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-DEFAULT border border-background-border hover:border-primary-500/30 text-text-secondary hover:text-white transition-all text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={shareAddress}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-DEFAULT border border-background-border hover:border-primary-500/30 text-text-secondary hover:text-white transition-all text-sm"
          >
            {shared ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Shared!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share
              </>
            )}
          </button>
          <button
            onClick={downloadQR}
            className="flex items-center justify-center w-12 py-3 rounded-xl bg-surface-DEFAULT border border-background-border hover:border-primary-500/30 text-text-secondary hover:text-white transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Warning */}
        <p className="text-text-muted text-xs mt-4">
          Only send TMZ (utmz) to this address. Sending other assets may result in permanent loss.
        </p>
      </div>
    </div>
  );
}
