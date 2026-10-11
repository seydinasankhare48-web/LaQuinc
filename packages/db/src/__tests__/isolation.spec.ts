import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../client';
import { auditLogs, memberships, tenants, users } from '../schema';
import { ADMIN_URL, APP_URL } from '../test/config';
import { seedWorld, type World } from '../test/seed';
import { withTenant } from '../with-tenant';

let admin: postgres.Sql;
let db: Database;
let w: World;

beforeAll(async () => {
  admin = postgres(ADMIN_URL, { max: 2, onnotice: () => {} });
  db = createDb(APP_URL, { max: 2 });
  w = await seedWorld(admin);
});

afterAll(async () => {
  await db.$client.end();
  await admin.end();
});

const asA = <T>(fn: Parameters<typeof withTenant<T>>[2]) =>
  withTenant(db, { tenantId: w.tenantA, userId: w.userA, role: 'owner' }, fn);

describe('memberships', () => {
  it('lists only the tenant own memberships', async () => {
    const rows = await asA((tx) => tx.select().from(memberships));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.tenantId === w.tenantA || r.userId === w.userA)).toBe(true);
    expect(rows.some((r) => r.id === w.membershipB)).toBe(false);
  });

  it('cannot read a membership of another tenant by id', async () => {
    const rows = await asA((tx) => tx.select().from(memberships).where(eq(memberships.id, w.membershipB)));
    expect(rows).toEqual([]);
  });

  it('cannot update a membership of another tenant', async () => {
    const rows = await asA((tx) =>
      tx.update(memberships).set({ role: 'cashier' }).where(eq(memberships.id, w.membershipB)).returning(),
    );
    expect(rows).toEqual([]);
    const [still] = await admin`SELECT role FROM memberships WHERE id = ${w.membershipB}`;
    expect(still?.role).toBe('owner');
  });

  it('cannot insert a membership into another tenant', async () => {
    await expect(
      asA((tx) =>
        tx.insert(memberships).values({ id: uuidv7(), tenantId: w.tenantB, userId: w.userA, role: 'owner' }),
      ),
    ).rejects.toThrow();
  });

  it('cannot delete memberships (logical archiving only)', async () => {
    await expect(asA((tx) => tx.delete(memberships).where(eq(memberships.id, w.membershipB)))).rejects.toThrow();
    await expect(asA((tx) => tx.delete(memberships).where(eq(memberships.id, w.membershipA)))).rejects.toThrow();
  });

  it('lets a user list their own memberships across tenants before choosing a tenant', async () => {
    const rows = await withTenant(db, { userId: w.userShared }, (tx) => tx.select().from(memberships));
    expect(rows.map((r) => r.tenantId).sort()).toEqual([w.tenantA, w.tenantB].sort());
  });

  it('hides the memberships of other tenants as soon as a tenant is active', async () => {
    const rows = await withTenant(db, { tenantId: w.tenantA, userId: w.userShared, role: 'cashier' }, (tx) =>
      tx.select().from(memberships),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.tenantId === w.tenantA)).toBe(true);
  });

  it('lets a user with no active tenant see their own tenants only (for the tenant picker)', async () => {
    const rows = await withTenant(db, { userId: w.userShared }, (tx) => tx.select().from(tenants));
    expect(rows.map((r) => r.id).sort()).toEqual([w.tenantA, w.tenantB].sort());
    const onlyA = await withTenant(db, { userId: w.userA }, (tx) => tx.select().from(tenants));
    expect(onlyA.map((r) => r.id)).toEqual([w.tenantA]);
    const stranger = await withTenant(db, { userId: uuidv7() }, (tx) => tx.select().from(tenants));
    expect(stranger).toEqual([]);
  });

  it('does not show a tenant whose membership is archived', async () => {
    await admin`UPDATE memberships SET archived_at = now() WHERE tenant_id = ${w.tenantB} AND user_id = ${w.userShared}`;
    const rows = await withTenant(db, { userId: w.userShared }, (tx) => tx.select().from(tenants));
    expect(rows.map((r) => r.id)).toEqual([w.tenantA]);
  });

  it('does not let a user with no tenant context write memberships', async () => {
    await expect(
      withTenant(db, { userId: w.userShared }, (tx) =>
        tx.insert(memberships).values({ id: uuidv7(), tenantId: w.tenantA, userId: w.userShared, role: 'owner' }),
      ),
    ).rejects.toThrow();
  });
});

describe('audit_logs', () => {
  it('reads only the tenant own entries', async () => {
    const rows = await asA((tx) => tx.select().from(auditLogs));
    expect(rows.some((r) => r.id === w.auditA)).toBe(true);
    expect(rows.some((r) => r.id === w.auditB)).toBe(false);
  });

  it('cannot write an entry for another tenant', async () => {
    await expect(
      asA((tx) =>
        tx.insert(auditLogs).values({ id: uuidv7(), tenantId: w.tenantB, actorUserId: w.userA, action: 'x', entity: 'x' }),
      ),
    ).rejects.toThrow();
  });

  it('can append an entry for its own tenant', async () => {
    const id = uuidv7();
    await asA((tx) =>
      tx.insert(auditLogs).values({ id, tenantId: w.tenantA, actorUserId: w.userA, action: 'sale.cancelled', entity: 'sales' }),
    );
    const rows = await asA((tx) => tx.select().from(auditLogs).where(eq(auditLogs.id, id)));
    expect(rows).toHaveLength(1);
  });

  it('is append-only for the application role', async () => {
    await expect(asA((tx) => tx.update(auditLogs).set({ action: 'edited' }).where(eq(auditLogs.id, w.auditA)))).rejects.toThrow();
    await expect(asA((tx) => tx.delete(auditLogs).where(eq(auditLogs.id, w.auditA)))).rejects.toThrow();
  });
});

describe('tenants', () => {
  it('sees only its own tenant', async () => {
    const rows = await asA((tx) => tx.select().from(tenants));
    expect(rows.map((r) => r.id)).toEqual([w.tenantA]);
  });

  it('cannot update another tenant', async () => {
    const rows = await asA((tx) => tx.update(tenants).set({ name: 'pwned' }).where(eq(tenants.id, w.tenantB)).returning());
    expect(rows).toEqual([]);
    const [still] = await admin`SELECT name FROM tenants WHERE id = ${w.tenantB}`;
    expect(still?.name).toBe('Quincaillerie B');
  });

  it('cannot create a tenant other than the one in context', async () => {
    await expect(
      asA((tx) => tx.insert(tenants).values({ id: uuidv7(), name: 'Autre', slug: `autre-${uuidv7()}` })),
    ).rejects.toThrow();
  });

  it('cannot delete a tenant', async () => {
    await expect(asA((tx) => tx.delete(tenants).where(eq(tenants.id, w.tenantA)))).rejects.toThrow();
  });
});

describe('users', () => {
  it('sees itself and the members of its tenant, not users of other tenants', async () => {
    const rows = await asA((tx) => tx.select().from(users));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(w.userA);
    expect(ids).toContain(w.userShared);
    expect(ids).not.toContain(w.userB);
  });

  it('cannot update another user', async () => {
    const rows = await asA((tx) => tx.update(users).set({ fullName: 'pwned' }).where(eq(users.id, w.userB)).returning());
    expect(rows).toEqual([]);
  });
});

describe('without tenant context', () => {
  it('sees no rows at all', async () => {
    const result = await withTenant(db, {}, async (tx) => ({
      tenants: await tx.select().from(tenants),
      memberships: await tx.select().from(memberships),
      users: await tx.select().from(users),
      audit: await tx.select().from(auditLogs),
    }));
    expect(result).toEqual({ tenants: [], memberships: [], users: [], audit: [] });
  });
});

describe('sign-up flow', () => {
  it('creates tenant, user and owner membership in one transaction under the new context', async () => {
    const tenantId = uuidv7();
    const userId = uuidv7();
    await admin`INSERT INTO auth.users (id, phone) VALUES (${userId}, '+221770000001')`;
    await withTenant(db, { tenantId, userId, role: 'owner' }, async (tx) => {
      await tx.insert(tenants).values({ id: tenantId, name: 'Nouvelle quincaillerie', slug: `new-${tenantId}` });
      await tx.insert(users).values({ id: userId, phone: '+221770000001' });
      await tx.insert(memberships).values({ id: uuidv7(), tenantId, userId, role: 'owner' });
    });
    const rows = await withTenant(db, { tenantId, userId }, (tx) => tx.select().from(memberships));
    expect(rows).toHaveLength(1);
  });

  it('cannot create a user row for someone else', async () => {
    const tenantId = uuidv7();
    await expect(
      withTenant(db, { tenantId, userId: w.userA, role: 'owner' }, (tx) =>
        tx.insert(users).values({ id: w.userB, phone: '+221770000002' }),
      ),
    ).rejects.toThrow();
  });
});
