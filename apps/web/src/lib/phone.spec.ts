import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('turns a local Senegalese number into E.164', () => {
    expect(normalizePhone('77 123 45 67')).toBe('+221771234567');
    expect(normalizePhone('771234567')).toBe('+221771234567');
    expect(normalizePhone('77-123-45-67')).toBe('+221771234567');
  });
  it('accepts international forms', () => {
    expect(normalizePhone('+221 77 123 45 67')).toBe('+221771234567');
    expect(normalizePhone('00221771234567')).toBe('+221771234567');
    expect(normalizePhone('221771234567')).toBe('+221771234567');
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('+33612345678');
  });
  it('rejects invalid input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('+221 12')).toBeNull();
    expect(normalizePhone('87 123 45 67')).toBeNull(); // un mobile sénégalais commence par 70, 75, 76, 77 ou 78
  });
});

describe('formatPhone', () => {
  it('displays Senegalese numbers as 77 123 45 67', () => {
    expect(formatPhone('+221771234567')).toBe('77 123 45 67');
  });
  it('leaves other numbers readable', () => {
    expect(formatPhone('+33612345678')).toBe('+33612345678');
  });
});
