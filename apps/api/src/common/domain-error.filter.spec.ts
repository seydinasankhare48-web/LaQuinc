import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainErrorFilter } from './domain-error.filter';
import { ConflictError } from './errors';

function host() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { res, host: { switchToHttp: () => ({ getResponse: () => res }) } as never };
}

afterEach(() => vi.restoreAllMocks());

describe('DomainErrorFilter', () => {
  it('maps domain errors to their status and code', () => {
    const { res, host: h } = host();
    new DomainErrorFilter().catch(new ConflictError('LAST_OWNER'), h);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'LAST_OWNER' } });
  });

  it('answers 500 without detail and never logs the message or parameters of an unexpected error', () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { res, host: h } = host();
    const dbError = Object.assign(new Error('Failed query: insert into users params: +221770000000'), { code: '23514' });
    new DomainErrorFilter().catch(dbError, h);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'INTERNAL_ERROR' } });
    const line = String(logged.mock.calls[0]?.[0]);
    expect(line).toContain('23514');
    expect(line).not.toContain('221770000000');
  });
});
