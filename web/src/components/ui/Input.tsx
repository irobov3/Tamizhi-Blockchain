import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      containerClassName,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={clsx('space-y-1.5', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
            {props.required && <span className="text-primary-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftElement && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-text-muted">
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full bg-surface-DEFAULT border text-text-primary placeholder-text-muted rounded-xl py-3 text-sm transition-colors duration-200 focus:outline-none focus:ring-1',
              leftElement ? 'pl-10 pr-4' : 'px-4',
              rightElement ? 'pr-10' : '',
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                : 'border-background-border focus:border-primary-500 focus:ring-primary-500/30',
              props.disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-text-muted">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-xs">{error}</p>
        )}

        {hint && !error && (
          <p className="text-text-muted text-xs">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
