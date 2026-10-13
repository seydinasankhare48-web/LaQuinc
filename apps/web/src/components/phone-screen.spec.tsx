import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthError, fakeAuth, json, renderApp } from '../test/helpers';
import { PhoneScreen } from './phone-screen';

const noPhone = () => json(200, { user: null, phone: null, memberships: [] });
const authed = (overrides = {}) => fakeAuth({ hasSession: vi.fn().mockResolvedValue(true), ...overrides });

async function enterPhone() {
  await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '77 123 45 67');
  await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
}

describe('PhoneScreen', () => {
  it('rejects an invalid number without calling Supabase', async () => {
    const auth = authed();
    renderApp(<PhoneScreen />, { auth, fetch: vi.fn().mockResolvedValue(noPhone()) });
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(await screen.findByText('Ce numéro n’est pas valide. Vérifiez-le.')).toBeInTheDocument();
    expect(auth.startPhoneVerification).not.toHaveBeenCalled();
  });

  it('adds the number then verifies the code', async () => {
    const auth = authed();
    renderApp(<PhoneScreen />, { auth, fetch: vi.fn().mockResolvedValue(noPhone()) });
    await enterPhone();
    await waitFor(() => expect(auth.startPhoneVerification).toHaveBeenCalledWith('+221771234567'));
    await userEvent.type(await screen.findByLabelText('Code à 6 chiffres'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    await waitFor(() => expect(auth.verifyPhone).toHaveBeenCalledWith('+221771234567', '123456'));
  });

  it('explains when the number belongs to another account', async () => {
    const auth = authed({ startPhoneVerification: vi.fn().mockRejectedValue(new AuthError('PHONE_TAKEN')) });
    renderApp(<PhoneScreen />, { auth, fetch: vi.fn().mockResolvedValue(noPhone()) });
    await enterPhone();
    expect(await screen.findByRole('alert')).toHaveTextContent('déjà utilisé par un autre compte');
    expect(screen.getByLabelText('Numéro de téléphone')).toBeInTheDocument();
  });

  it('shows a clear message for a wrong code', async () => {
    const auth = authed({ verifyPhone: vi.fn().mockRejectedValue(new AuthError('INVALID_CODE')) });
    renderApp(<PhoneScreen />, { auth, fetch: vi.fn().mockResolvedValue(noPhone()) });
    await enterPhone();
    await userEvent.type(await screen.findByLabelText('Code à 6 chiffres'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code incorrect ou expiré');
  });
});
