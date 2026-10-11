import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from 'uuidv7';
import { addMember, createTestApp, createUser, type TestApp } from '../test/harness';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

const http = () => request(t.app.getHttpServer());

describe('POST /tenants (sign-up)', () => {
  it('creates tenant, user and owner membership, and writes the audit log', async () => {
    const user = await createUserAuthOnly();
    const token = await t.token({ sub: user.id, phone: user.phone.slice(1) });
    const res = await http()
      .post('/tenants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Quincaillerie Diop & Fils', fullName: 'Moussa Diop', ninea: '123456789' })
      .expect(201);
    expect(res.body.tenant.name).toBe('Quincaillerie Diop & Fils');
    expect(res.body.tenant.slug).toMatch(/^quincaillerie-diop-fils-[0-9a-f]{6}$/);
    expect(res.body.membership.role).toBe('owner');

    const tenantId = res.body.tenant.id as string;
    const [m] = await t.admin`SELECT role, user_id FROM memberships WHERE tenant_id = ${tenantId}`;
    expect(m).toMatchObject({ role: 'owner', user_id: user.id });
    const [u] = await t.admin`SELECT phone, full_name FROM users WHERE id = ${user.id}`;
    expect(u).toMatchObject({ phone: user.phone, full_name: 'Moussa Diop' });
    const logs = await t.admin`SELECT action, actor_user_id FROM audit_logs WHERE tenant_id = ${tenantId}`;
    expect(logs).toEqual([{ action: 'tenant.created', actor_user_id: user.id }]);
  });

  it('lets the same user create a second tenant and then asks which one is active', async () => {
    const user = await createUserAuthOnly();
    const token = await t.token({ sub: user.id, phone: user.phone });
    const post = (name: string) =>
      http().post('/tenants').set('Authorization', `Bearer ${token}`).send({ name });
    const first = await post('Boutique Un').expect(201);
    const second = await post('Boutique Deux').expect(201);
    expect(first.body.tenant.id).not.toBe(second.body.tenant.id);

    const me = await http().get('/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.memberships).toHaveLength(2);
    await http().get('/tenants/current').set('Authorization', `Bearer ${token}`).expect(400);
    await http()
      .get('/tenants/current')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', first.body.tenant.id)
      .expect(200);
  });

  it('requires a phone number in the token', async () => {
    const user = await createUserAuthOnly();
    const res = await http()
      .post('/tenants')
      .set('Authorization', `Bearer ${await t.token({ sub: user.id })}`)
      .send({ name: 'Sans téléphone' })
      .expect(400);
    expect(res.body.error.code).toBe('PHONE_REQUIRED');
  });

  it('validates the body without leaking internals', async () => {
    const user = await createUserAuthOnly();
    const res = await http()
      .post('/tenants')
      .set('Authorization', `Bearer ${await t.token({ sub: user.id, phone: user.phone })}`)
      .send({ name: 'A', unexpected: 1 })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/stack|postgres|select /i);
  });

  it('requires authentication', async () => {
    await http().post('/tenants').send({ name: 'Anonyme' }).expect(401);
  });

  it('does not let the client choose the tenant id or the role', async () => {
    const user = await createUserAuthOnly();
    const forced = uuidv7();
    const res = await http()
      .post('/tenants')
      .set('Authorization', `Bearer ${await t.token({ sub: user.id, phone: user.phone })}`)
      .send({ name: 'Forcée', id: forced, role: 'cashier', tenantId: forced })
      .expect(201);
    expect(res.body.tenant.id).not.toBe(forced);
    expect(res.body.membership.role).toBe('owner');
  });
});

describe('tenant settings', () => {
  it('lets an owner update settings, audited; managers and cashiers get 403', async () => {
    const owner = await createUserAuthOnly();
    const created = await http()
      .post('/tenants')
      .set('Authorization', `Bearer ${await t.token({ sub: owner.id, phone: owner.phone })}`)
      .send({ name: 'Réglages' })
      .expect(201);
    const tenantId = created.body.tenant.id as string;
    const ownerToken = await t.token({ sub: owner.id });

    const res = await http()
      .patch('/tenants/current')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Réglages v2', rccm: 'SN-DKR-2026-B-1' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Réglages v2', rccm: 'SN-DKR-2026-B-1' });
    const logs = await t.admin`SELECT details FROM audit_logs WHERE tenant_id = ${tenantId} AND action = 'tenant.updated'`;
    expect(logs).toHaveLength(1);

    for (const role of ['manager', 'cashier'] as const) {
      const member = await addMember(t.admin, tenantId, role);
      const res403 = await http()
        .patch('/tenants/current')
        .set('Authorization', `Bearer ${await t.token({ sub: member.userId })}`)
        .send({ name: 'Piratage' })
        .expect(403);
      expect(res403.body.error.code).toBe('INSUFFICIENT_ROLE');
      await http().get('/tenants/current').set('Authorization', `Bearer ${await t.token({ sub: member.userId })}`).expect(200);
    }
  });

  it('rejects an empty update', async () => {
    const owner = await createUserAuthOnly();
    await http()
      .post('/tenants')
      .set('Authorization', `Bearer ${await t.token({ sub: owner.id, phone: owner.phone })}`)
      .send({ name: 'Vide' })
      .expect(201);
    await http().patch('/tenants/current').set('Authorization', `Bearer ${await t.token({ sub: owner.id })}`).send({}).expect(400);
  });
});

/** Utilisateur présent dans `auth.users` seulement : c'est l'état juste après la première connexion par OTP. */
async function createUserAuthOnly() {
  const full = await createUser(t.admin);
  await t.admin`DELETE FROM users WHERE id = ${full.id}`;
  return full;
}
