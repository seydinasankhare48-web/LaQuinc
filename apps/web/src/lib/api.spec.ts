import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './api';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('ApiClient', () => {
  it('sends the bearer token and the active tenant', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { ok: true }));
    const api = new ApiClient({ baseUrl: 'http://api.test', getToken: async () => 'tok', getTenantId: () => 'tenant-1', fetch: fetchMock });
    await api.get('/tenants/current');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/tenants/current');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['X-Tenant-Id']).toBe('tenant-1');
  });

  it('omits the tenant header when there is no active tenant', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}));
    const api = new ApiClient({ baseUrl: 'http://api.test', getToken: async () => 'tok', getTenantId: () => null, fetch: fetchMock });
    await api.get('/me');
    expect(fetchMock.mock.calls[0]![1].headers['X-Tenant-Id']).toBeUndefined();
  });

  it('turns API error bodies into ApiError with the code', async () => {
    const api = new ApiClient({ baseUrl: 'http://api.test', getToken: async () => 'tok', getTenantId: () => null, fetch: vi.fn().mockResolvedValue(json(409, { error: { code: 'TENANT_LIMIT' } })) });
    await expect(api.post('/tenants', { name: 'x' })).rejects.toMatchObject({ status: 409, code: 'TENANT_LIMIT' });
  });

  it('reports network failures as offline errors', async () => {
    const api = new ApiClient({ baseUrl: 'http://api.test', getToken: async () => 'tok', getTenantId: () => null, fetch: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });
    const error = await api.get('/me').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).offline).toBe(true);
  });

  it('fails with an unauthorized error when there is no session token', async () => {
    const api = new ApiClient({ baseUrl: 'http://api.test', getToken: async () => null, getTenantId: () => null, fetch: vi.fn() });
    await expect(api.get('/me')).rejects.toMatchObject({ status: 401, code: 'MISSING_TOKEN' });
  });

  it('handles non-JSON error bodies', async () => {
    const api = new ApiClient({ baseUrl: 'http://api.test', getToken: async () => 't', getTenantId: () => null, fetch: vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })) });
    await expect(api.get('/me')).rejects.toMatchObject({ status: 502, code: 'INTERNAL_ERROR' });
  });
});
