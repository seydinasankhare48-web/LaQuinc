import type { ReactNode } from 'react';
import { cn } from './cn';

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        tone === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-sky-200 bg-sky-50 text-sky-900',
      )}
    >
      {children}
    </div>
  );
}
