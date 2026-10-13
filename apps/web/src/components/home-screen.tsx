'use client';

import { useState } from 'react';
import { t } from '@laquinc/i18n';
import { Alert, Button } from '@laquinc/ui';
import { useApp, type MeMembership } from '../lib/app-state';

export function HomeScreen({ active }: { active: MeMembership }) {
  const { signOut, services } = useApp();
  const [linkError, setLinkError] = useState(false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">{t('home.welcome')}</p>
        <h1 className="text-2xl font-bold">{active.tenantName}</h1>
        <p className="text-stone-700">{t('home.role', { role: t(`role.${active.role}`) })}</p>
      </header>
      <p className="text-stone-700">{t('home.next')}</p>
      {linkError && <Alert>{t('home.linkGoogle.failed')}</Alert>}
      <Button variant="secondary" onClick={() => services.auth.linkGoogle().catch(() => setLinkError(true))}>
        {t('home.linkGoogle')}
      </Button>
      <Button variant="secondary" onClick={() => void signOut()}>
        {t('common.logout')}
      </Button>
    </main>
  );
}
