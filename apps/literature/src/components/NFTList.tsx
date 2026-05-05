'use client';

import type { NFTToken } from '@/lib/types';

interface NFTListProps {
  nfts: NFTToken[];
  loading?: boolean;
}

export default function NFTList({ nfts, loading = false }: NFTListProps) {
  if (loading) {
    return (
      <div style={{ color: '#9b8469', fontSize: '14px', padding: '16px 0' }}>
        Loading NFT ownership data…
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div
        style={{
          background: '#fdf6e3',
          border: '1px dashed #e8c980',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          color: '#7a6545',
          fontSize: '14px',
        }}
      >
        No NFTs have been minted for this work yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {nfts.map((nft) => (
        <div
          key={nft.token_id}
          style={{
            background: '#fff',
            border: '1px solid #e8e0d0',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* NFT icon */}
            <span
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #f39c12, #c0392b)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              &#x1F4DC;
            </span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d1b00' }}>
                Token #{nft.token_id}
              </div>
              {nft.minted_at && (
                <div style={{ fontSize: '11px', color: '#9b8469', marginTop: '2px' }}>
                  Minted {new Date(nft.minted_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#7a6545', marginBottom: '2px' }}>Owner</div>
            <code
              style={{
                fontSize: '12px',
                background: '#f5f0e8',
                padding: '3px 8px',
                borderRadius: '4px',
                color: '#4a3520',
                wordBreak: 'break-all',
              }}
            >
              {nft.owner.length > 20
                ? `${nft.owner.slice(0, 12)}…${nft.owner.slice(-8)}`
                : nft.owner}
            </code>
          </div>
        </div>
      ))}
    </div>
  );
}
