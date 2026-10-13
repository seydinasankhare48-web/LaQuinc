'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiClient, ApiError } from './api';
import type { AuthPort } from './auth-port';
import type { TenantStore } from './tenant-store';

export interface MeMembership {
  id: string;
  tenantId: string;
  role: 'owner' | 'manager' | 'cashier';
  tenantName: string;
  tenantSlug: string;
}

export interface Me {
  user: { id: string; phone: string; fullName: string | null } | null;
  phone: string | null;
  memberships: MeMembership[];
}

export type AppStatus =
  | { name: 'loading' }
  | { name: 'signedOut' }
  | { name: 'error'; offline: boolean; code: string }
  | { name: 'needsPhone' }
  | { name: 'needsSignup' }
  | { name: 'needsPicker'; memberships: MeMembership[] }
  | { name: 'ready'; active: MeMembership; memberships: MeMembership[] };

export interface AppServices {
  auth: AuthPort;
  apiBaseUrl: string;
  tenantStore: TenantStore;
  navigate: (path: string) => void;
  fetch?: typeof fetch;
}

interface AppContextValue {
  status: AppStatus;
  services: AppServices;
  api: ApiClient;
  refresh: () => Promise<void>;
  selectTenant: (tenantId: string) => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

/** Route canonique de chaque état : c'est là qu'un écran renvoie l'utilisateur s'il n'est pas à sa place. */
export function routeFor(status: AppStatus): string | null {
  switch (status.name) {
    case 'signedOut':
      return '/connexion';
    case 'needsPhone':
      return '/telephone';
    case 'needsSignup':
      return '/inscription';
    case 'needsPicker':
      return '/choisir';
    case 'ready':
      return '/';
    default:
      return null;
  }
}

export function AppProvider({ services, children }: { services: AppServices; children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>({ name: 'loading' });
  const api = useMemo(
    () =>
      new ApiClient({
        baseUrl: services.apiBaseUrl,
        getToken: () => services.auth.getToken(),
        getTenantId: () => services.tenantStore.get(),
        fetch: services.fetch,
      }),
    [services],
  );
  const run = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++run.current;
    const apply = (next: AppStatus) => {
      if (id === run.current) setStatus(next);
    };
    if (!(await services.auth.hasSession())) {
      services.tenantStore.set(null);
      apply({ name: 'signedOut' });
      return;
    }
    try {
      // /me ne dépend pas du tenant actif : on n'envoie pas d'en-tête de tenant périmé.
      const me = await new ApiClient({
        baseUrl: services.apiBaseUrl,
        getToken: () => services.auth.getToken(),
        getTenantId: () => null,
        fetch: services.fetch,
      }).get<Me>('/me');
      const { memberships } = me;
      // Connecté sans numéro (ex. par Google) : le numéro vérifié est obligatoire avant de créer une quincaillerie.
      if (memberships.length === 0) return apply({ name: me.phone ? 'needsSignup' : 'needsPhone' });
      const stored = services.tenantStore.get();
      const active = memberships.find((m) => m.tenantId === stored) ?? (memberships.length === 1 ? memberships[0] : undefined);
      if (!active) return apply({ name: 'needsPicker', memberships });
      services.tenantStore.set(active.tenantId);
      apply({ name: 'ready', active, memberships });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Session refusée par l'API : on repart de zéro.
        await services.auth.signOut().catch(() => undefined);
        services.tenantStore.set(null);
        return apply({ name: 'signedOut' });
      }
      const offline = error instanceof ApiError ? error.offline : false;
      apply({ name: 'error', offline, code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR' });
    }
  }, [services]);

  useEffect(() => {
    void refresh();
    return services.auth.onChange(() => void refresh());
  }, [services, refresh]);

  const selectTenant = useCallback(
    (tenantId: string) => {
      services.tenantStore.set(tenantId);
      void refresh();
    },
    [services, refresh],
  );

  const signOut = useCallback(async () => {
    services.tenantStore.set(null);
    await services.auth.signOut();
    await refresh();
  }, [services, refresh]);

  const value = useMemo(() => ({ status, services, api, refresh, selectTenant, signOut }), [status, services, api, refresh, selectTenant, signOut]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
