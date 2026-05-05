import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[3px]',
};

export function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2">
      <span
        className={clsx(
          'inline-block rounded-full border-current border-r-transparent animate-spin',
          sizeClasses[size],
          className || 'text-primary-400'
        )}
      />
      {label && label !== 'Loading...' && (
        <span className="text-text-muted text-sm">{label}</span>
      )}
    </span>
  );
}
