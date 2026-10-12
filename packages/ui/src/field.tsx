import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  hint?: string;
  error?: string | null;
  prefix?: ReactNode;
}

/** Libellé + champ + aide/erreur, relié pour les lecteurs d'écran. Hauteur ≥ 44 px. */
export function Field({ label, hint, error, prefix, className, id, ...rest }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-stone-800">
        {label}
      </label>
      <div
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-lg border bg-white px-3 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-emerald-700',
          error ? 'border-red-600' : 'border-stone-300',
        )}
      >
        {prefix && <span className="text-stone-600">{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('min-h-10 w-full bg-transparent text-base text-stone-900 outline-none', className)}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-stone-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
