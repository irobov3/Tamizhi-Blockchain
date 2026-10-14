import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string; // Tailwind text-* class or CSS color
  className?: string;
  label?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'text-saffron-400',
  className = '',
  label = 'Loading…',
}) => {
  return (
    <svg
      role="status"
      aria-label={label}
      className={[sizeMap[size], color, 'animate-spin shrink-0', className].filter(Boolean).join(' ')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

/** Full-screen centered spinner overlay */
export const SpinnerOverlay: React.FC<{ label?: string }> = ({ label }) => (
  <div className="fixed inset-0 bg-navy-950/70 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      {label && <p className="text-white/60 text-sm">{label}</p>}
    </div>
  </div>
);
