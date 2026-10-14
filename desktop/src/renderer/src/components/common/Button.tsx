import React from 'react';

// MARK: - Types

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// MARK: - Styles

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-900 select-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-saffron-500 text-navy-900 hover:bg-saffron-400 active:bg-saffron-600 focus:ring-saffron-400 disabled:bg-saffron-500/40 disabled:text-navy-900/50',
  secondary:
    'bg-transparent border border-gold-400 text-gold-400 hover:bg-gold-400/10 active:bg-gold-400/20 focus:ring-gold-400 disabled:border-gold-400/30 disabled:text-gold-400/40',
  ghost:
    'bg-transparent text-white/70 hover:bg-white/10 active:bg-white/15 focus:ring-white/30 disabled:text-white/30',
  danger:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus:ring-red-500 disabled:bg-red-600/40',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm h-8',
  md: 'px-4 py-2 text-sm h-10',
  lg: 'px-6 py-3 text-base h-12',
};

// MARK: - Spinner

const Spinner: React.FC<{ size: ButtonSize }> = ({ size }) => {
  const dim = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <svg
      className={`${dim} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
};

// MARK: - Component

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={[
          base,
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : '',
          isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <Spinner size={size} />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}

        {children && <span>{children}</span>}

        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
