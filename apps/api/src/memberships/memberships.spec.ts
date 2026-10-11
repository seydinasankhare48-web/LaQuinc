import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedWorld, type World } from '@laquinc/db/testing';
import { addMember, createTestApp, type TestApp } from '../test/harness';

let t: TestApp;
let w: World;
beforeAll(async () => {
  t = await createTestApp();
  w = await seedWorld(t.admin);
});
afterAll(() => t.close());

const http = () => request(t.app.getHttpServer());
const auth = async (sub: string) => `Bearer ${await t.token({ sub })}`;

describe('roles on /memberships', () => {
  it('lists members for owner and manager, 403 for cashier', async () => {
    const manager = await addMember(t.admin, w.tenantA, 'manager');
    const owner = await http().get('/memberships').set('Authorization', await auth(w.userA)).expect(200);
    expect(owner.body.length).toBeGreaterThanOrEqual(3);
    expect(owner.body.every((m: { id: string }) => m.id !== w.membershipB)).toBe(true);
    await http().get('/memberships').set('Authorization', await auth(manager.userId)).expect(200);
    await http()
      .get('/memberships')
      .set('Authorization', await auth(w.userShared))
      .set('X-Tenant-Id', w.tenantA)
      .expect(403);
  });

  it('forbids managers and cashiers from changing roles', async () => {
    const manager = await addMember(t.admin, w.tenantA, 'manager');
    const target = await addMember(t.admin, w.tenantA, 'cashier');
    for (const sub of [manager.userId, w.userShared]) {
      await http()
        .patch(`/memberships/${target.membershipId}`)
        .set('Authorization', await auth(sub))
        .set('X-Tenant-Id', w.tenantA)
        .send({ role: 'owner' })
        .expect(403);
    }
    const [row] = await t.admin`SELECT role FROM memberships WHERE id = ${target.membershipId}`;
    expect(row?.role).toBe('cashier');
  });

  it('rejects a cashier trying to archive the owner', async () => {
    await http()
      .post(`/memberships/${w.membershipA}/archive`)
      .set('Authorization', await auth(w.userShared))
      .set('X-Tenant-Id', w.tenantA)
      .expect(403);
  });
});

describe('role changes by an owner', () => {
  it('changes a role and writes the audit log', async () => {
    const target = await addMember(t.admin, w.tenantA, 'cashier');
    const res = await http()
      .patch(`/memberships/${target.membershipId}`)
      .set('Authorization', await auth(w.userA))
      .send({ role: 'manager' })
      .expect(200);
    expect(res.body.role).toBe('manager');
    const logs = await t.admin`
      SELECT action, actor_user_id, details FROM audit_logs WHERE entity_id = ${target.membershipId}`;
    expect(logs).toEqual([
      { action: 'membership.role_changed', actor_user_id: w.userA, details: { from: 'cashier', to: 'manager' } },
    ]);
  });

  it('rejects an unknown role', async () => {
    const target = await addMember(t.admin, w.tenantA, 'cashier');
    await http()
      .patch(`/memberships/${target.membershipId}`)
      .set('Authorization', await auth(w.userA))
      .send({ role: 'superadmin' })
      .expect(400);
  });

  it('cannot change its own role', async () => {
    await http()
      .patch(`/memberships/${w.membershipA}`)
      .set('Authorization', await auth(w.userA))
      .send({ role: 'cashier' })
      .expect(403);
  });

  it('keeps at least one owner (demote and archive)', async () => {
    // Un second owner peut rétrograder le premier ; le dernier restant est protégé.
    const second = await addMember(t.admin, w.tenantA, 'owner');
    await http()
      .patch(`/memberships/${w.membershipA}`)
      .set('Authorization', await auth(second.userId))
      .set('X-Tenant-Id', w.tenantA)
      .send({ role: 'manager' })
      .expect(200);
    // `second` est maintenant le dernier owner : il ne peut agir que sur d'autres membres, jamais sur lui-même
    const third = await addMember(t.admin, w.tenantA, 'manager');
    await http()
      .post(`/memberships/${third.membershipId}/archive`)
      .set('Authorization', await auth(second.userId))
      .set('X-Tenant-Id', w.tenantA)
      .expect(201);
    // Le premier (devenu manager) ne peut plus rien faire sur les owners
    await http()
      .patch(`/memberships/${second.membershipId}`)
      .set('Authorization', await auth(w.userA))
      .set('X-Tenant-Id', w.tenantA)
      .send({ role: 'cashier' })
      .expect(403);
  });

  it('refuses to demote the last owner even for another owner racing', async () => {
    const o1 = await addMember(t.admin, w.tenantB, 'owner');
    const o2 = await addMember(t.admin, w.tenantB, 'owner');
    await t.admin`UPDATE memberships SET archived_at = now() WHERE id = ${w.membershipB}`;
    const demote = async (actor: string, target: string) =>
      http()
        .patch(`/memberships/${target}`)
        .set('Authorization', await auth(actor))
        .set('X-Tenant-Id', w.tenantB)
        .send({ role: 'cashier' });
    const [r1, r2] = await Promise.all([demote(o1.userId, o2.membershipId), demote(o2.userId, o1.membershipId)]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses[0]).toBe(200);
    expect([409, 403]).toContain(statuses[1]);
    const owners = await t.admin`
      SELECT id FROM memberships WHERE tenant_id = ${w.tenantB} AND role = 'owner' AND archived_at IS NULL`;
    expect(owners.length).toBe(1);
  });
});

describe('tenant isolation on /memberships', () => {
  it("never reveals or touches another tenant's memberships (404)", async () => {
    const ownerA = await addMember(t.admin, w.tenantA, 'owner');
    const before = await t.admin`SELECT role, archived_at FROM memberships WHERE id = ${w.membershipB}`;
    await http()
      .patch(`/memberships/${w.membershipB}`)
      .set('Authorization', await auth(ownerA.userId))
      .send({ role: 'cashier' })
      .expect(404);
    await http()
      .post(`/memberships/${w.membershipB}/archive`)
      .set('Authorization', await auth(ownerA.userId))
      .expect(404);
    const after = await t.admin`SELECT role, archived_at FROM memberships WHERE id = ${w.membershipB}`;
    expect(after).toEqual(before);
  });

  it("cannot be bypassed by sending the other tenant's id in X-Tenant-Id", async () => {
    const ownerA = await addMember(t.admin, w.tenantA, 'owner');
    await http()
      .get('/memberships')
      .set('Authorization', await auth(ownerA.userId))
      .set('X-Tenant-Id', w.tenantB)
      .expect(404);
  });
});
