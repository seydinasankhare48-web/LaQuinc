import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeAuth, json, renderApp } from '../test/helpers';
import { SignupScreen } from './signup-screen';

const authed = () => fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
const noTenant = () => json(200, { user: null, phone: null, memberships: [] });

describe('SignupScreen', () => {
  it('requires a name of at least 2 characters and does not call the API', async () => {
    const fetch = vi.fn().mockResolvedValue(noTenant());
    renderApp(<SignupScreen />, { auth: authed(), fetch });
    await userEvent.type(screen.getByLabelText('Nom de la quincaillerie'), 'A');
    await userEvent.click(screen.getByRole('button', { name: 'Créer ma quincaillerie' }));
    expect(await screen.findByText('Le nom doit avoir au moins 2 caractères.')).toBeInTheDocument();
    expect(fetch.mock.calls.every(([url]) => !String(url).endsWith('/tenants'))).toBe(true);
  });

  it('posts only the filled fields, remembers the new tenant and refreshes', async () => {
    const fetch = vi.fn(async (url: string, _init?: RequestInit) =>
      String(url).endsWith('/tenants') ? json(201, { tenant: { id: 'new-tenant' }, membership: { id: 'm', role: 'owner' } }) : noTenant(),
    );
    const { services } = renderApp(<SignupScreen />, { auth: authed(), fetch: fetch as unknown as typeof globalThis.fetch });
    await userEvent.type(screen.getByLabelText('Nom de la quincaillerie'), 'Quincaillerie Diop');
    await userEvent.type(screen.getByLabelText(/NINEA/), '123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Créer ma quincaillerie' }));
    await waitFor(() => expect(services.tenantStore.get()).toBe('new-tenant'));
    const post = fetch.mock.calls.find(([url]) => String(url).endsWith('/tenants'))!;
    expect(JSON.parse(String(post[1]?.body))).toEqual({ name: 'Quincaillerie Diop', ninea: '123456789' });
  });

  it('translates API errors', async () => {
    const fetch = vi.fn(async (url: string) =>
      String(url).endsWith('/tenants') ? json(409, { error: { code: 'TENANT_LIMIT' } }) : noTenant(),
    );
    renderApp(<SignupScreen />, { auth: authed(), fetch: fetch as unknown as typeof globalThis.fetch });
    await userEvent.type(screen.getByLabelText('Nom de la quincaillerie'), 'Trop');
    await userEvent.click(screen.getByRole('button', { name: 'Créer ma quincaillerie' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('nombre maximal');
    expect(screen.getByRole('button', { name: 'Créer ma quincaillerie' })).toBeEnabled();
  });
});
