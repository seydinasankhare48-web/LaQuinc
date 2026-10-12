import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AuthError, type AuthPort } from './auth-port';

function toAuthError(error: { status?: number; code?: string; message?: string }): AuthError {
  if (error.status === 429 || error.code === 'over_sms_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return new AuthError('RATE_LIMITED');
  }
  if (error.status === 0 || /fetch/i.test(error.message ?? '')) return new AuthError('NETWORK');
  if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 422) {
    return new AuthError('INVALID_CODE');
  }
  return new AuthError('UNKNOWN');
}

export function createSupabaseAuth(client: SupabaseClient): AuthPort {
  return {
    async hasSession() {
      const { data } = await client.auth.getSession();
      return data.session !== null;
    },
    async getToken() {
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? null;
    },
    onChange(listener) {
      const { data } = client.auth.onAuthStateChange(() => listener());
      return () => data.subscription.unsubscribe();
    },
    async sendCode(phone) {
      const { error } = await client.auth.signInWithOtp({ phone, options: { channel: 'sms' } });
      if (error) throw toAuthError(error);
    },
    async verifyCode(phone, token) {
      const { error } = await client.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw toAuthError(error);
    },
    async signOut() {
      await client.auth.signOut();
    },
  };
}

/**
 * Le client est créé à partir des variables publiques, au premier usage (le rendu serveur de Next ne l'appelle jamais).
 * Jamais de clé `service_role` côté navigateur.
 */
export function createBrowserAuth(): AuthPort {
  let port: AuthPort | undefined;
  const get = (): AuthPort => {
    if (!port) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required');
      port = createSupabaseAuth(createClient(url, key));
    }
    return port;
  };
  return {
    hasSession: () => get().hasSession(),
    getToken: () => get().getToken(),
    onChange: (listener) => get().onChange(listener),
    sendCode: (phone) => get().sendCode(phone),
    verifyCode: (phone, code) => get().verifyCode(phone, code),
    signOut: () => get().signOut(),
  };
}
