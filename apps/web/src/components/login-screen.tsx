'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { t } from '@laquinc/i18n';
import { Alert, Button, Field } from '@laquinc/ui';
import { AuthError } from '../lib/auth-port';
import { useApp } from '../lib/app-state';
import { formatPhone, normalizePhone } from '../lib/phone';

const RESEND_SECONDS = 30;

function authMessage(error: unknown, wrongCode: boolean): string {
  if (error instanceof AuthError) {
    if (error.code === 'RATE_LIMITED') return t('login.tooManyRequests');
    if (error.code === 'NETWORK') return t('state.offline');
    if (error.code === 'INVALID_CODE' && wrongCode) return t('login.code.wrong');
  }
  return t('state.error');
}

export function LoginScreen() {
  const { services } = useApp();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function send(e164: string) {
    setBusy(true);
    setFormError(null);
    try {
      await services.auth.sendCode(e164);
      setPhone(e164);
      setStep('code');
      setCode('');
      setSeconds(RESEND_SECONDS);
    } catch (error) {
      setFormError(authMessage(error, false));
    } finally {
      setBusy(false);
    }
  }

  function onPhoneSubmit(e: FormEvent) {
    e.preventDefault();
    const e164 = normalizePhone(phoneInput);
    if (!e164) {
      setFieldError(t('login.phone.invalid'));
      return;
    }
    setFieldError(null);
    void send(e164);
  }

  async function onCodeSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(code)) {
      setFieldError(t('login.code.invalid'));
      return;
    }
    setFieldError(null);
    setFormError(null);
    setBusy(true);
    try {
      await services.auth.verifyCode(phone!, code);
      // La redirection est faite par <Guard> dès que la session est détectée.
    } catch (error) {
      setFormError(authMessage(error, true));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">{t('app.name')}</p>
        <h1 className="text-2xl font-bold">{step === 'phone' ? t('login.title') : t('login.code.title')}</h1>
        <p className="text-stone-700">
          {step === 'phone' ? t('login.subtitle') : t('login.code.subtitle', { phone: formatPhone(phone ?? '') })}
        </p>
      </header>

      {formError && <Alert>{formError}</Alert>}

      {step === 'phone' ? (
        <form onSubmit={onPhoneSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            label={t('login.phone.label')}
            hint={t('login.phone.hint')}
            error={fieldError}
            prefix="+221"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
          />
          <Button type="submit" loading={busy}>
            {t('login.sendCode')}
          </Button>
        </form>
      ) : (
        <form onSubmit={(e) => void onCodeSubmit(e)} className="flex flex-col gap-4" noValidate>
          <Field
            label={t('login.code.label')}
            error={fieldError}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <Button type="submit" loading={busy}>
            {t('login.code.verify')}
          </Button>
          <Button variant="secondary" disabled={seconds > 0 || busy} onClick={() => phone && void send(phone)}>
            {seconds > 0 ? t('login.code.resendIn', { seconds }) : t('login.code.resend')}
          </Button>
          <Button variant="ghost" onClick={() => { setStep('phone'); setFormError(null); setFieldError(null); }}>
            {t('login.code.changePhone')}
          </Button>
        </form>
      )}
    </main>
  );
}
