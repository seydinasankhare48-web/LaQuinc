'use client';

import { useState, type FormEvent } from 'react';
import { t, tError } from '@laquinc/i18n';
import { createTenantSchema } from '@laquinc/validation';
import { Alert, Button, Field } from '@laquinc/ui';
import { ApiError } from '../lib/api';
import { useApp } from '../lib/app-state';

export function SignupScreen() {
  const { api, services, refresh } = useApp();
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [ninea, setNinea] = useState('');
  const [rccm, setRccm] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = createTenantSchema.safeParse({
      name,
      fullName: fullName || undefined,
      ninea: ninea || undefined,
      rccm: rccm || undefined,
    });
    if (!parsed.success) {
      const nameIssue = parsed.error.issues.some((i) => i.path[0] === 'name');
      setNameError(nameIssue ? t('signup.name.invalid') : null);
      if (!nameIssue) setFormError(tError('VALIDATION_ERROR'));
      return;
    }
    setNameError(null);
    setBusy(true);
    try {
      const created = await api.post<{ tenant: { id: string } }>('/tenants', parsed.data);
      services.tenantStore.set(created.tenant.id);
      await refresh();
    } catch (error) {
      setFormError(error instanceof ApiError && error.offline ? t('state.offline') : tError(error instanceof ApiError ? error.code : undefined));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{t('signup.title')}</h1>
        <p className="text-stone-700">{t('signup.subtitle')}</p>
      </header>
      {formError && <Alert>{formError}</Alert>}
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4" noValidate>
        <Field label={t('signup.name.label')} error={nameError} value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" />
        <Field label={t('signup.fullName.label')} hint={t('common.optional')} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        <Field label={t('signup.ninea.label')} hint={t('common.optional')} value={ninea} onChange={(e) => setNinea(e.target.value)} />
        <Field label={t('signup.rccm.label')} hint={t('common.optional')} value={rccm} onChange={(e) => setRccm(e.target.value)} />
        <Button type="submit" loading={busy}>
          {t('signup.submit')}
        </Button>
      </form>
    </main>
  );
}
