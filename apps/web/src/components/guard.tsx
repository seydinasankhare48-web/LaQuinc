'use client';

import { useEffect, type ReactNode } from 'react';
import { t, tError } from '@laquinc/i18n';
import { Alert, Button, Spinner } from '@laquinc/ui';
import { routeFor, useApp, type AppStatus } from '../lib/app-state';

type Name = AppStatus['name'];

/**
 * Affiche l'écran seulement si l'état de l'application correspond ; sinon redirige vers la route
 * de l'état courant. Gère aussi les états « chargement » et « erreur / hors ligne ».
 */
export function Guard({ allow, children }: { allow: Name; children: (status: AppStatus) => ReactNode }) {
  const { status, services, refresh } = useApp();
  const target = status.name === allow ? null : routeFor(status);

  useEffect(() => {
    if (target) services.navigate(target);
  }, [target, services]);

  if (status.name === 'loading' || target) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-4">
        <Spinner label={t('common.loading')} />
      </main>
    );
  }
  if (status.name === 'error') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4">
        <Alert>{status.offline ? t('state.offline') : tError(status.code)}</Alert>
        <Button onClick={() => void refresh()}>{t('common.retry')}</Button>
      </main>
    );
  }
  return <>{children(status)}</>;
}
