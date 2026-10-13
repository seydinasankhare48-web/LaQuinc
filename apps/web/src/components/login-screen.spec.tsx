import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthError, fakeAuth, renderApp } from '../test/helpers';
import { LoginScreen } from './login-screen';

describe('LoginScreen', () => {
  it('rejects an invalid phone number without calling Supabase', async () => {
    const auth = fakeAuth();
    renderApp(<LoginScreen />, { auth });
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '12 34');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(await screen.findByText('Ce numéro n’est pas valide. Vérifiez-le.')).toBeInTheDocument();
    expect(auth.sendCode).not.toHaveBeenCalled();
  });

  it('sends the code to the E.164 number then asks for the code', async () => {
    const auth = fakeAuth();
    renderApp(<LoginScreen />, { auth });
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '77 123 45 67');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    await waitFor(() => expect(auth.sendCode).toHaveBeenCalledWith('+221771234567'));
    expect(await screen.findByText('Code envoyé au 77 123 45 67.')).toBeInTheDocument();
    expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
  });

  it('verifies the code and keeps digits only', async () => {
    const auth = fakeAuth();
    renderApp(<LoginScreen />, { auth });
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '771234567');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    const input = await screen.findByLabelText('Code à 6 chiffres');
    await userEvent.type(input, '12a345 6');
    expect(input).toHaveValue('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    await waitFor(() => expect(auth.verifyCode).toHaveBeenCalledWith('+221771234567', '123456'));
  });

  it('refuses a code that is not 6 digits', async () => {
    const auth = fakeAuth();
    renderApp(<LoginScreen />, { auth });
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '771234567');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    await userEvent.type(await screen.findByLabelText('Code à 6 chiffres'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(await screen.findByText('Le code doit avoir 6 chiffres.')).toBeInTheDocument();
    expect(auth.verifyCode).not.toHaveBeenCalled();
  });

  it('shows a clear message for a wrong code and lets the user retry', async () => {
    const auth = fakeAuth({ verifyCode: vi.fn().mockRejectedValue(new AuthError('INVALID_CODE')) });
    renderApp(<LoginScreen />, { auth });
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '771234567');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    await userEvent.type(await screen.findByLabelText('Code à 6 chiffres'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code incorrect ou expiré');
    expect(screen.getByRole('button', { name: 'Valider' })).toBeEnabled();
  });

  it('shows the rate limit and offline messages', async () => {
    const auth = fakeAuth({ sendCode: vi.fn().mockRejectedValueOnce(new AuthError('RATE_LIMITED')).mockRejectedValueOnce(new AuthError('NETWORK')) });
    renderApp(<LoginScreen />, { auth });
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '771234567');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop d’essais');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('hors ligne'));
  });

  it('disables resend during the countdown and allows going back to change the number', async () => {
    renderApp(<LoginScreen />);
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '771234567');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(await screen.findByRole('button', { name: /Renvoyer le code dans \d+ s/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Changer de numéro' }));
    expect(screen.getByLabelText('Numéro de téléphone')).toBeInTheDocument();
  });
});

describe('LoginScreen — Google', () => {
  it('starts the Google sign-in', async () => {
    const auth = fakeAuth();
    renderApp(<LoginScreen />, { auth });
    await userEvent.click(screen.getByRole('button', { name: 'Continuer avec Google' }));
    expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows an error and re-enables the button when Google cannot start', async () => {
    const auth = fakeAuth({ signInWithGoogle: vi.fn().mockRejectedValue(new AuthError('UNKNOWN')) });
    renderApp(<LoginScreen />, { auth });
    await userEvent.click(screen.getByRole('button', { name: 'Continuer avec Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('connexion avec Google a échoué');
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeEnabled();
  });
});
