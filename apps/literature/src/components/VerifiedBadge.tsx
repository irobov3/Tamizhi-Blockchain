'use client';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md';
}

export default function VerifiedBadge({ size = 'md' }: VerifiedBadgeProps) {
  const fontSize = size === 'sm' ? '11px' : '12px';
  const iconSize = size === 'sm' ? '12px' : '14px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#dcfce7',
        color: '#15803d',
        borderRadius: '999px',
        fontSize,
        fontWeight: 600,
        padding: size === 'sm' ? '2px 6px' : '3px 10px',
        whiteSpace: 'nowrap',
      }}
      title="Verified on-chain"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="8" fill="#15803d" />
        <path
          d="M4.5 8.5L6.5 10.5L11.5 5.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified
    </span>
  );
}
