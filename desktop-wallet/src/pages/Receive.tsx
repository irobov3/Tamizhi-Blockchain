import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "../store/wallet";
import { useToast } from "../components/Toast";
import { useNetwork } from "../store/network";

const C = {
  card:    '#1a1040',
  border:  '#2a1f5c',
  gold:    '#d4a017',
  text:    '#fdf6e3',
  muted:   '#8a8aa0',
  success: '#00c48c',
  bg:      '#0e0824',
}

export function Receive() {
  const { active } = useWallet();
  const { current } = useNetwork();
  const push = useToast((s) => s.push);
  const [copied, setCopied] = useState(false);
  const [hovCopy, setHovCopy] = useState(false);
  const [hovShare, setHovShare] = useState(false);

  if (!active) {
    return (
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          color: C.muted,
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        Create a wallet first.
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(active!.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      push("success", "Address copied to clipboard");
    } catch {
      push("error", "Clipboard access denied");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Tamizhi Address", text: active!.address });
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: C.gold, fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>
          📥 Receive TMZ
        </h2>
        <p style={{ color: C.muted, fontSize: 13, margin: '0 0 28px' }}>
          Share this address to receive TMZ on Tamizhi
        </p>

        {/* QR Code */}
        <div
          style={{
            display: 'inline-block',
            background: '#fff',
            padding: 16,
            borderRadius: 16,
            marginBottom: 24,
            boxShadow: `0 0 0 4px ${C.gold}30`,
          }}
        >
          <QRCodeSVG
            value={active.address}
            size={200}
            fgColor="#1a1040"
            bgColor="#ffffff"
            level="M"
          />
        </div>

        {/* Address display */}
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 20,
            wordBreak: 'break-all',
            fontFamily: 'monospace',
            fontSize: 13,
            color: C.text,
            lineHeight: 1.6,
            userSelect: 'text',
          }}
        >
          {active.address}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
          <button
            onClick={copy}
            onMouseEnter={() => setHovCopy(true)}
            onMouseLeave={() => setHovCopy(false)}
            style={{
              padding: '11px 24px',
              borderRadius: 8,
              background: copied ? C.success : hovCopy ? `${C.gold}dd` : C.gold,
              color: '#1a1040',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.15s',
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Address'}
          </button>

          <button
            onClick={share}
            onMouseEnter={() => setHovShare(true)}
            onMouseLeave={() => setHovShare(false)}
            style={{
              padding: '11px 24px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${C.border}`,
              color: hovShare ? C.text : C.muted,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.15s, border-color 0.15s',
              borderColor: hovShare ? C.gold : C.border,
            }}
          >
            🔗 Share
          </button>
        </div>

        {/* Network info */}
        <div
          style={{
            background: `${C.gold}08`,
            border: `1px solid ${C.gold}20`,
            borderRadius: 10,
            padding: '14px 16px',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Network Info
          </div>
          {[
            { label: 'Chain ID', value: current.chainId },
            { label: 'Denom', value: current.denom },
            { label: 'Network', value: current.label },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                padding: '4px 0',
              }}
            >
              <span style={{ color: C.muted }}>{row.label}</span>
              <span style={{ color: C.text, fontFamily: 'monospace' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
