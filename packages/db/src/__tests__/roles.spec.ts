import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../client';
import { auditLogs, memberships, tenants, users } from '../schema';
import { ADMIN_URL, APP_URL } from '../test/config';
import { seedWorld, type World } from '../test/seed';
import { withTenant, type TenantContext } from '../with-tenant';

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

const ctx = (role: TenantContext['role'], userId: string): TenantContext => ({ tenantId: w.tenantA, userId, role });

describe('role-based writes (defense in depth, behind the API checks)', () => {
  it('a cashier cannot promote themselves or anyone else', async () => {
    const rows = await withTenant(db, ctx('cashier', w.userShared), (tx) =>
      tx.update(memberships).set({ role: 'owner' }).where(eq(memberships.userId, w.userShared)).returning(),
    );
    expect(rows).toEqual([]);
    const [m] = await admin`SELECT role FROM memberships WHERE user_id = ${w.userShared} AND tenant_id = ${w.tenantA}`;
    expect(m?.role).toBe('cashier');
  });

  it('a cashier cannot demote the owner', async () => {
    const rows = await withTenant(db, ctx('cashier', w.userShared), (tx) =>
      tx.update(memberships).set({ role: 'cashier' }).where(eq(memberships.id, w.membershipA)).returning(),
    );
    expect(rows).toEqual([]);
  });

  it('a cashier or manager cannot add members', async () => {
    for (const role of ['cashier', 'manager'] as const) {
      await expect(
        withTenant(db, ctx(role, w.userShared), (tx) =>
          tx.insert(memberships).values({ id: uuidv7(), tenantId: w.tenantA, userId: w.userB, role: 'owner' }),
        ),
      ).rejects.toThrow();
    }
  });

  it('a cashier or manager cannot modify the tenant settings', async () => {
    for (const role of ['cashier', 'manager'] as const) {
      const rows = await withTenant(db, ctx(role, w.userShared), (tx) =>
        tx.update(tenants).set({ name: 'pwned' }).where(eq(tenants.id, w.tenantA)).returning(),
      );
      expect(rows).toEqual([]);
    }
  });

  it('a context without a role cannot write memberships or tenants', async () => {
    await expect(
      withTenant(db, { tenantId: w.tenantA, userId: w.userA }, (tx) =>
        tx.insert(memberships).values({ id: uuidv7(), tenantId: w.tenantA, userId: w.userB, role: 'cashier' }),
      ),
    ).rejects.toThrow();
  });

  it('an owner can manage members and settings', async () => {
    const rows = await withTenant(db, ctx('owner', w.userA), (tx) =>
      tx.update(tenants).set({ name: 'Quincaillerie A renommée' }).where(eq(tenants.id, w.tenantA)).returning(),
    );
    expect(rows).toHaveLength(1);
    const added = await withTenant(db, ctx('owner', w.userA), (tx) =>
      tx.insert(memberships).values({ id: uuidv7(), tenantId: w.tenantA, userId: w.userB, role: 'cashier' }).returning(),
    );
    expect(added).toHaveLength(1);
  });

  it('rejects an invalid role in the context', async () => {
    await expect(
      withTenant(db, { tenantId: w.tenantA, role: 'admin' as never }, async () => 1),
    ).rejects.toThrow(/role/);
  });
});

describe('users', () => {
  it('cannot change their phone number (Supabase Auth is the source of truth)', async () => {
    await expect(
      withTenant(db, ctx('cashier', w.userShared), (tx) =>
        tx.update(users).set({ phone: '+221771111111' }).where(eq(users.id, w.userShared)),
      ),
    ).rejects.toThrow();
  });

  it('can change their own display name', async () => {
    const rows = await withTenant(db, ctx('cashier', w.userShared), (tx) =>
      tx.update(users).set({ fullName: 'Awa' }).where(eq(users.id, w.userShared)).returning(),
    );
    expect(rows).toHaveLength(1);
  });
});

describe('audit_logs integrity', () => {
  it('cannot log in the name of another user', async () => {
    await expect(
      withTenant(db, ctx('cashier', w.userShared), (tx) =>
        tx.insert(auditLogs).values({ id: uuidv7(), tenantId: w.tenantA, actorUserId: w.userA, action: 'x', entity: 'x' }),
      ),
    ).rejects.toThrow();
  });

  it('always stamps the entry with the database clock', async () => {
    const id = uuidv7();
    await withTenant(db, ctx('cashier', w.userShared), (tx) =>
      tx
        .insert(auditLogs)
        .values({ id, tenantId: w.tenantA, actorUserId: w.userShared, action: 'x', entity: 'x', createdAt: new Date('2001-01-01') }),
    );
    const [row] = await admin`SELECT created_at FROM audit_logs WHERE id = ${id}`;
    expect(Date.now() - new Date(String(row?.created_at)).getTime()).toBeLessThan(60_000);
  });
});

describe('memberships columns', () => {
  it('has no PIN hash column (PINs get their own restricted table in week 5)', async () => {
    const cols = await admin`SELECT column_name FROM information_schema.columns WHERE table_name = 'memberships'`;
    expect(cols.map((c) => c.column_name)).not.toContain('pin_hash');
  });
});
