'use client';

import { t } from '@laquinc/i18n';
import { Button } from '@laquinc/ui';
import { useApp, type MeMembership } from '../lib/app-state';

export function PickerScreen({ memberships }: { memberships: MeMembership[] }) {
  const { selectTenant } = useApp();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{t('picker.title')}</h1>
        <p className="text-stone-700">{t('picker.subtitle')}</p>
      </header>
      <ul className="flex flex-col gap-3">
        {memberships.map((m) => (
          <li key={m.tenantId}>
            <Button variant="secondary" onClick={() => selectTenant(m.tenantId)}>
              {m.tenantName} · {t(`role.${m.role}`)}
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}
