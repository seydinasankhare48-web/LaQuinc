import { describe, expect, it } from 'vitest';
import { t, tError } from './index';

describe('t', () => {
  it('returns the French message for a key', () => {
    expect(t('app.name')).toBe('LaQuinc');
  });
  it('interpolates parameters', () => {
    expect(t('login.code.subtitle', { phone: '77 123 45 67' })).toBe('Code envoyé au 77 123 45 67.');
  });
});

describe('tError', () => {
  it('maps API error codes and falls back to a generic message', () => {
    expect(tError('TENANT_LIMIT')).toMatch(/maximal/);
    expect(tError('SOMETHING_NEW')).toBe(t('error.INTERNAL_ERROR'));
    expect(tError(undefined)).toBe(t('error.INTERNAL_ERROR'));
  });
});
