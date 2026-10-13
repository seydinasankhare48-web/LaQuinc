'use client';

import { useEffect, useRef, useState } from 'react';
import { t } from '@laquinc/i18n';
import { Alert, Button, Spinner } from '@laquinc/ui';
import { useApp } from '../lib/app-state';

/** Page de retour de Google : échange le code contre une session, puis laisse <Guard> router selon l'état. */
export function CallbackScreen() {
  const { services, refresh } = useApp();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // le code ne sert qu'une fois (mode strict de React)
    started.current = true;
    services.auth
      .completeOAuth(window.location.href)
      .then(() => refresh())
      .then(() => services.navigate('/'))
      .catch(() => setFailed(true));
  }, [services, refresh]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4">
      {failed ? (
        <>
          <Alert>{t('callback.failed')} {t('login.google.failed')}</Alert>
          <Button onClick={() => services.navigate('/connexion')}>{t('callback.back')}</Button>
        </>
      ) : (
        <Spinner label={t('callback.loading')} />
      )}
    </main>
  );
}
