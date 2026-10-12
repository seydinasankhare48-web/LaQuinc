import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Guard } from '../components/guard';
import { fakeAuth, json, renderApp } from '../test/helpers';

const m = (tenantId: string, name: string, role = 'owner') => ({ id: `m-${tenantId}`, tenantId, role, tenantName: name, tenantSlug: name });
const me = (memberships: ReturnType<typeof m>[]) => json(200, { user: null, phone: null, memberships });
const screens = (allow: 'ready' | 'signedOut' | 'needsSignup' | 'needsPicker') => (
  <Guard allow={allow}>{() => <p>ECRAN {allow}</p>}</Guard>
);

describe('application state', () => {
  it('redirects to /connexion without a session, and never calls the API', async () => {
    const fetch = vi.fn();
    const { navigate } = renderApp(screens('ready'), { fetch });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/connexion'));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('redirects a user without any quincaillerie to /inscription', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    const { navigate } = renderApp(screens('ready'), { auth, fetch: vi.fn().mockResolvedValue(me([])) });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/inscription'));
  });

  it('opens the only quincaillerie directly and remembers it', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    const { services } = renderApp(screens('ready'), { auth, fetch: vi.fn().mockResolvedValue(me([m('t1', 'Diop')])) });
    expect(await screen.findByText('ECRAN ready')).toBeInTheDocument();
    expect(services.tenantStore.get()).toBe('t1');
  });

  it('asks to choose when there are several and none is remembered', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    const { navigate } = renderApp(screens('ready'), { auth, fetch: vi.fn().mockResolvedValue(me([m('t1', 'A'), m('t2', 'B')])) });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/choisir'));
  });

  it('uses the remembered quincaillerie when it is still valid, and ignores a stale one', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    const two = me([m('t1', 'A'), m('t2', 'B')]);
    const ok = renderApp(screens('ready'), { auth, tenant: 't2', fetch: vi.fn().mockResolvedValue(two.clone()) });
    expect(await screen.findByText('ECRAN ready')).toBeInTheDocument();
    ok.unmount();
    const stale = renderApp(screens('ready'), { auth, tenant: 'gone', fetch: vi.fn().mockResolvedValue(two.clone()) });
    await waitFor(() => expect(stale.navigate).toHaveBeenCalledWith('/choisir'));
  });

  it('never sends a stale tenant header to /me', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    const fetch = vi.fn().mockResolvedValue(me([m('t1', 'A')]));
    renderApp(screens('ready'), { auth, tenant: 'gone', fetch });
    await screen.findByText('ECRAN ready');
    expect((fetch.mock.calls[0]![1] as { headers: Record<string, string> }).headers['X-Tenant-Id']).toBeUndefined();
  });

  it('signs out and returns to /connexion when the API rejects the session', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    const { navigate } = renderApp(screens('ready'), { auth, fetch: vi.fn().mockResolvedValue(json(401, { error: { code: 'INVALID_TOKEN' } })) });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/connexion'));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('shows an offline state with a retry button', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(me([m('t1', 'A')]));
    renderApp(screens('ready'), { auth, fetch });
    expect(await screen.findByRole('alert')).toHaveTextContent('hors ligne');
    screen.getByRole('button', { name: 'Réessayer' }).click();
    expect(await screen.findByText('ECRAN ready')).toBeInTheDocument();
  });

  it('shows a generic error for API failures', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    renderApp(screens('ready'), { auth, fetch: vi.fn().mockResolvedValue(json(500, { error: { code: 'INTERNAL_ERROR' } })) });
    expect(await screen.findByRole('alert')).toHaveTextContent('Une erreur est survenue');
  });
});
