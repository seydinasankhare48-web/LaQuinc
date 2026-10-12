'use client';

import { t } from '@laquinc/i18n';
import { Button } from '@laquinc/ui';
import { useApp, type MeMembership } from '../lib/app-state';

export function HomeScreen({ active }: { active: MeMembership }) {
  const { signOut } = useApp();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">{t('home.welcome')}</p>
        <h1 className="text-2xl font-bold">{active.tenantName}</h1>
        <p className="text-stone-700">{t('home.role', { role: t(`role.${active.role}`) })}</p>
      </header>
      <p className="text-stone-700">{t('home.next')}</p>
      <Button variant="secondary" onClick={() => void signOut()}>
        {t('common.logout')}
      </Button>
    </main>
  );
}
