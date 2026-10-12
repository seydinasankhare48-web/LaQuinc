import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { AppProvider, type AppServices } from '../lib/app-state';
import { AuthError, type AuthPort } from '../lib/auth-port';

export function fakeAuth(overrides: Partial<AuthPort> = {}): AuthPort & { emit: () => void } {
  const listeners = new Set<() => void>();
  return {
    hasSession: vi.fn().mockResolvedValue(false),
    getToken: vi.fn().mockResolvedValue('token'),
    onChange: vi.fn((l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    }),
    sendCode: vi.fn().mockResolvedValue(undefined),
    verifyCode: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
    emit: () => listeners.forEach((l) => l()),
  };
}

export function memoryTenantStore(initial: string | null = null) {
  let value = initial;
  return { get: () => value, set: (v: string | null) => void (value = v) };
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export function renderApp(ui: ReactElement, opts: { auth?: AuthPort; fetch?: typeof fetch; tenant?: string | null } = {}) {
  const navigate = vi.fn();
  const services: AppServices = {
    auth: opts.auth ?? fakeAuth(),
    apiBaseUrl: 'http://api.test',
    tenantStore: memoryTenantStore(opts.tenant ?? null),
    navigate,
    fetch: opts.fetch,
  };
  return { navigate, services, ...render(<AppProvider services={services}>{ui}</AppProvider>) };
}

export { AuthError };
