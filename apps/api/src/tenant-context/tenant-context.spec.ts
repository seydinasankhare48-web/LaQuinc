import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from 'uuidv7';
import { seedWorld, type World } from '@laquinc/db/testing';
import { addMember, createTestApp, type TestApp } from '../test/harness';

let t: TestApp;
let w: World;
beforeAll(async () => {
  t = await createTestApp();
  w = await seedWorld(t.admin);
});
afterAll(() => t.close());

const as = async (sub: string, tenantId?: string) => {
  const r = request(t.app.getHttpServer()).get('/tenants/current').set('Authorization', `Bearer ${await t.token({ sub })}`);
  return tenantId ? r.set('X-Tenant-Id', tenantId) : r;
};
const status = async (sub: string, tenantId?: string) => (await as(sub, tenantId)).status;

describe('active tenant resolution', () => {
  it('uses the only membership when no header is sent', async () => {
    const res = await as(w.userA);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(w.tenantA);
  });

  it('never trusts a tenant id the user is not a member of (404, no existence leak)', async () => {
    const res = await as(w.userA, w.tenantB);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'TENANT_NOT_FOUND' } });
    const unknown = await as(w.userA, uuidv7());
    expect(unknown.status).toBe(404);
    expect(unknown.body).toEqual(res.body);
  });

  it('rejects a malformed tenant id', async () => {
    expect(await status(w.userA, "x'; DROP TABLE tenants;--")).toBe(400);
  });

  it('asks for a tenant when the user belongs to several', async () => {
    expect(await status(w.userShared)).toBe(400);
    const a = await as(w.userShared, w.tenantA);
    const b = await as(w.userShared, w.tenantB);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.id).toBe(w.tenantA);
    expect(b.body.id).toBe(w.tenantB);
  });

  it('gives a user without any membership no tenant', async () => {
    const orphan = await addMember(t.admin, w.tenantA, 'cashier');
    await t.admin`DELETE FROM memberships WHERE id = ${orphan.membershipId}`;
    expect(await status(orphan.userId)).toBe(404);
  });

  it('ignores an archived membership', async () => {
    const m = await addMember(t.admin, w.tenantA, 'cashier');
    expect(await status(m.userId)).toBe(200);
    await t.admin`UPDATE memberships SET archived_at = now() WHERE id = ${m.membershipId}`;
    expect(await status(m.userId)).toBe(404);
  });

  it('ignores an archived tenant', async () => {
    const tenantId = uuidv7();
    await t.admin`INSERT INTO tenants (id, name, slug, archived_at) VALUES (${tenantId}, 'Fermée', ${'closed-' + tenantId}, now())`;
    const m = await addMember(t.admin, tenantId, 'owner');
    expect(await status(m.userId)).toBe(404);
  });
});
