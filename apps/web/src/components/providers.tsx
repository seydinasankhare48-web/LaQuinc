'use client';

import { useRouter } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { AppProvider, type AppServices } from '../lib/app-state';
import { createBrowserAuth } from '../lib/supabase-auth';
import { localTenantStore } from '../lib/tenant-store';

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const services = useMemo<AppServices>(
    () => ({
      auth: createBrowserAuth(),
      apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
      tenantStore: localTenantStore,
      navigate: (path) => router.replace(path),
    }),
    [router],
  );
  return <AppProvider services={services}>{children}</AppProvider>;
}
