import { describe, expect, it } from 'vitest';
import { t } from './index';

describe('t', () => {
  it('returns the French message for a key', () => {
    expect(t('app.name')).toBe('LaQuinc');
  });
});
