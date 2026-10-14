import React, { useState } from 'react';

// MARK: - Types

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Show password toggle button (only applies when type="password") */
  passwordToggle?: boolean;
  containerClassName?: string;
}

// MARK: - Component

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      passwordToggle = false,
      type = 'text',
      containerClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const effectiveType = type === 'password' && showPassword ? 'text' : type;

    const hasLeft = !!leftIcon;
    const hasRight = !!rightIcon || (type === 'password' && passwordToggle);

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-white/50 uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* Left icon */}
          {hasLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={[
              'w-full rounded-lg bg-white/[0.07] text-white placeholder-white/30',
              'border border-transparent focus:border-gold-400/60',
              'outline-none ring-0 focus:ring-1 focus:ring-gold-400/30',
              'transition-colors duration-150',
              'py-2.5 text-sm',
              hasLeft ? 'pl-9' : 'pl-3',
              hasRight ? 'pr-10' : 'pr-3',
              error ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {/* Right icon or password toggle */}
          {hasRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {type === 'password' && passwordToggle ? (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-white/40 hover:text-white/70 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    // Eye-slash
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    // Eye
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              ) : (
                <span className="text-white/40 pointer-events-none">{rightIcon}</span>
              )}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}

        {/* Hint */}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-white/35">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
