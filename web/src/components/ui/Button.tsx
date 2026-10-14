import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { Spinner } from './Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses = {
  primary:
    'bg-primary-500 hover:bg-primary-400 active:bg-primary-600 text-white shadow-glow-primary hover:shadow-lg',
  secondary:
    'bg-surface-DEFAULT hover:bg-surface-hover active:bg-surface-active text-text-primary border border-background-border',
  accent:
    'bg-accent hover:bg-accent-400 active:bg-accent-600 text-secondary-DEFAULT font-semibold',
  ghost:
    'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary',
  danger:
    'bg-red-500 hover:bg-red-400 active:bg-red-600 text-white',
  outline:
    'bg-transparent border border-primary-500 text-primary-400 hover:bg-primary-500/10',
};

const sizeClasses = {
  xs: 'text-xs px-2.5 py-1.5 rounded-lg',
  sm: 'text-sm px-3.5 py-2 rounded-lg',
  md: 'text-sm px-5 py-2.5 rounded-xl',
  lg: 'text-base px-7 py-3.5 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner
            size="sm"
            className={
              variant === 'accent' ? 'text-secondary-DEFAULT' : 'text-current'
            }
          />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
