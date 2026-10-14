'use client'

interface NFTToken {
  token_id?: string
  tokenId?: string
  work_id?: string
  owner: string
  minted_at?: string
  mintedAt?: string
  tx_hash?: string
  txHash?: string
}

interface NFTListProps {
  nfts: NFTToken[]
  loading?: boolean
}

export default function NFTList({ nfts, loading = false }: NFTListProps) {
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: '64px',
              background: '#0e0824',
              borderRadius: '8px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div style={{
        background: 'rgba(138,138,160,0.06)',
        border: '1px dashed #2a1f5c',
        borderRadius: '10px',
        padding: '24px',
        textAlign: 'center',
        color: '#8a8aa0',
        fontSize: '14px',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.5 }}>📜</div>
        No NFTs have been minted for this work yet.
        <br />
        <span style={{ fontSize: '12px', opacity: 0.7 }}>Be the first patron to mint one.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {nfts.map((nft, idx) => {
        const tokenId = nft.token_id ?? nft.tokenId ?? String(idx + 1)
        const mintedAt = nft.minted_at ?? nft.mintedAt
        const shortOwner = nft.owner.length > 20
          ? `${nft.owner.slice(0, 12)}…${nft.owner.slice(-8)}`
          : nft.owner

        return (
          <div
            key={tokenId}
            style={{
              background: '#0e0824',
              border: '1px solid #2a1f5c',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* NFT icon */}
              <div style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #d4a017, #b8860b)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0,
                boxShadow: '0 0 10px rgba(212,160,23,0.3)',
              }}>
                📜
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fdf6e3' }}>
                  Token #{tokenId}
                </div>
                {mintedAt && (
                  <div style={{ fontSize: '11px', color: '#8a8aa0', marginTop: '2px' }}>
                    Minted {new Date(mintedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#8a8aa0', marginBottom: '4px', letterSpacing: '0.05em' }}>
                OWNER
              </div>
              <code style={{
                fontSize: '12px',
                background: 'rgba(212,160,23,0.1)',
                border: '1px solid rgba(212,160,23,0.2)',
                padding: '3px 10px',
                borderRadius: '6px',
                color: '#d4a017',
                wordBreak: 'break-all',
              }}>
                {shortOwner}
              </code>
            </div>
          </div>
        )
      })}
    </div>
  )
}
