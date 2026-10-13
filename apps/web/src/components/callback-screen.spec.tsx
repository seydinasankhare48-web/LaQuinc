import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthError, fakeAuth, json, renderApp } from '../test/helpers';
import { CallbackScreen } from './callback-screen';

describe('CallbackScreen', () => {
  it('exchanges the code once, then goes back to the app', async () => {
    const auth = fakeAuth({ hasSession: vi.fn().mockResolvedValue(true) });
    const { navigate } = renderApp(<CallbackScreen />, { auth, fetch: vi.fn().mockResolvedValue(json(200, { user: null, phone: null, memberships: [] })) });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    expect(auth.completeOAuth).toHaveBeenCalledTimes(1);
  });

  it('shows an error and a way back when the exchange fails', async () => {
    const auth = fakeAuth({ completeOAuth: vi.fn().mockRejectedValue(new AuthError('INVALID_CODE')) });
    const { navigate } = renderApp(<CallbackScreen />, { auth });
    expect(await screen.findByRole('alert')).toHaveTextContent('La connexion a échoué');
    screen.getByRole('button', { name: 'Retour à la connexion' }).click();
    expect(navigate).toHaveBeenCalledWith('/connexion');
  });
});
