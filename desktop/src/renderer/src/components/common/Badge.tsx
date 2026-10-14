import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'gold';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  success: {
    container: 'bg-green-900/60 text-green-300 border-green-700/50',
    dot: 'bg-green-400',
  },
  warning: {
    container: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    dot: 'bg-amber-400',
  },
  error: {
    container: 'bg-red-900/60 text-red-300 border-red-700/50',
    dot: 'bg-red-400',
  },
  info: {
    container: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
    dot: 'bg-blue-400',
  },
  default: {
    container: 'bg-navy-700/80 text-white/70 border-white/10',
    dot: 'bg-white/50',
  },
  gold: {
    container: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/40',
    dot: 'bg-yellow-400',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  dot = false,
  className = '',
}) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        styles.container,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
};
