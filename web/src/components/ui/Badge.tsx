import { HTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'accent';
  size?: 'xs' | 'sm' | 'md';
  onRemove?: () => void;
  dot?: boolean;
}

const variantClasses = {
  default: 'bg-surface-DEFAULT border border-background-border text-text-secondary',
  primary: 'bg-primary-500/15 border border-primary-500/25 text-primary-400',
  secondary: 'bg-secondary-700/40 border border-secondary-600/30 text-text-secondary',
  success: 'bg-green-500/15 border border-green-500/25 text-green-400',
  warning: 'bg-yellow-500/15 border border-yellow-500/25 text-yellow-400',
  error: 'bg-red-500/15 border border-red-500/25 text-red-400',
  accent: 'bg-accent/15 border border-accent/25 text-accent',
};

const dotColors = {
  default: 'bg-text-muted',
  primary: 'bg-primary-400',
  secondary: 'bg-text-secondary',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  accent: 'bg-accent',
};

const sizeClasses = {
  xs: 'text-xs px-2 py-0.5 rounded-md',
  sm: 'text-xs px-2.5 py-1 rounded-lg',
  md: 'text-sm px-3 py-1 rounded-lg',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  onRemove,
  dot,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium leading-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="flex-shrink-0 hover:text-white transition-colors -mr-0.5"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
