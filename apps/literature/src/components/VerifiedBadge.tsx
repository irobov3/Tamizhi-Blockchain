'use client'

interface VerifiedBadgeProps {
  size?: 'sm' | 'md'
  verifiedBy?: string
}

export default function VerifiedBadge({ size = 'md', verifiedBy }: VerifiedBadgeProps) {
  const isSm = size === 'sm'
  const truncated = verifiedBy
    ? `${verifiedBy.slice(0, 10)}…${verifiedBy.slice(-6)}`
    : undefined

  return (
    <span
      title={verifiedBy ? `Verified by ${verifiedBy}` : 'Verified on Tamizhi Chain'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(34,197,94,0.12)',
        border: '1px solid rgba(34,197,94,0.3)',
        color: '#22c55e',
        borderRadius: '999px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 600,
        padding: isSm ? '2px 8px' : '4px 12px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      {/* Checkmark circle */}
      <svg
        width={isSm ? '12' : '14'}
        height={isSm ? '12' : '14'}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="7" fill="#22c55e" />
        <path
          d="M4.5 8.5L6.5 10.5L11.5 5.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified on Chain
      {!isSm && truncated && (
        <span style={{ opacity: 0.7, fontSize: '10px', marginLeft: '2px' }}>
          · {truncated}
        </span>
      )}
    </span>
  )
}
