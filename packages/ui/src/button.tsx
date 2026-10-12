import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';
import { Spinner } from './spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

const variants = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-300',
  secondary: 'border border-stone-300 bg-white text-stone-900 hover:bg-stone-50 disabled:text-stone-400',
  ghost: 'text-emerald-800 hover:bg-emerald-50 disabled:text-stone-400',
} as const;

/** Cible tactile d'au moins 44 px (conventions.md). */
export function Button({ variant = 'primary', loading, disabled, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
