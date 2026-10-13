import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AuthError, type AuthPort } from './auth-port';

function toAuthError(error: { status?: number; code?: string; message?: string }): AuthError {
  if (error.code === 'phone_exists') return new AuthError('PHONE_TAKEN');
  if (error.status === 429 || error.code === 'over_sms_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return new AuthError('RATE_LIMITED');
  }
  if (error.status === 0 || /fetch/i.test(error.message ?? '')) return new AuthError('NETWORK');
  if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 422) {
    return new AuthError('INVALID_CODE');
  }
  return new AuthError('UNKNOWN');
}

export function createSupabaseAuth(client: SupabaseClient, callbackUrl: () => string): AuthPort {
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
    async signInWithGoogle() {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl() } });
      if (error) throw toAuthError(error);
    },
    async completeOAuth(url) {
      const code = new URL(url).searchParams.get('code');
      if (!code) throw new AuthError('INVALID_CODE');
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw toAuthError(error);
    },
    async startPhoneVerification(phone) {
      const { error } = await client.auth.updateUser({ phone });
      if (error) throw toAuthError(error);
    },
    async verifyPhone(phone, token) {
      const { error } = await client.auth.verifyOtp({ phone, token, type: 'phone_change' });
      if (error) throw toAuthError(error);
      // Le jeton d'accès ne porte le numéro qu'après renouvellement.
      const refreshed = await client.auth.refreshSession();
      if (refreshed.error) throw toAuthError(refreshed.error);
    },
    async linkGoogle() {
      const { error } = await client.auth.linkIdentity({ provider: 'google', options: { redirectTo: callbackUrl() } });
      if (error) throw toAuthError(error);
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
      port = createSupabaseAuth(
        // PKCE ; l'échange du code est fait explicitement par la page de rappel.
        createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: false } }),
        () => `${window.location.origin}/auth/callback`,
      );
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
    signInWithGoogle: () => get().signInWithGoogle(),
    completeOAuth: (url) => get().completeOAuth(url),
    startPhoneVerification: (phone) => get().startPhoneVerification(phone),
    verifyPhone: (phone, code) => get().verifyPhone(phone, code),
    linkGoogle: () => get().linkGoogle(),
  };
}
