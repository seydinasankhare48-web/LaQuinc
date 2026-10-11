import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../client';
import { memberships } from '../schema';
import { ADMIN_URL, APP_URL } from '../test/config';
import { seedWorld, type World } from '../test/seed';
import { InvalidTenantContextError, withTenant } from '../with-tenant';

let admin: postgres.Sql;
let db: Database;
let w: World;

beforeAll(async () => {
  admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  // Un seul connexion : si le contexte fuyait, la requête suivante le verrait.
  db = createDb(APP_URL, { max: 1 });
  w = await seedWorld(admin);
});

afterAll(async () => {
  await db.$client.end();
  await admin.end();
});

describe('withTenant', () => {
  it('does not leak the tenant context to the next transaction on the same connection', async () => {
    const inside = await withTenant(db, { tenantId: w.tenantA, userId: w.userA }, (tx) => tx.select().from(memberships));
    expect(inside.length).toBeGreaterThan(0);
    const after = await db.select().from(memberships);
    expect(after).toEqual([]);
    const [setting] = await db.execute<{ v: string | null }>(sql`SELECT current_setting('app.tenant_id', true) AS v`);
    expect(setting?.v ?? '').toBe('');
  });

  it('switches context between consecutive calls', async () => {
    const a = await withTenant(db, { tenantId: w.tenantA }, (tx) => tx.select().from(memberships));
    const b = await withTenant(db, { tenantId: w.tenantB }, (tx) => tx.select().from(memberships));
    expect(a.every((r) => r.tenantId === w.tenantA)).toBe(true);
    expect(b.every((r) => r.tenantId === w.tenantB)).toBe(true);
  });

  it('rolls back on error', async () => {
    await expect(
      withTenant(db, { tenantId: w.tenantA }, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const after = await db.select().from(memberships);
    expect(after).toEqual([]);
  });

  it('rejects an invalid tenant or user id without touching the database', async () => {
    await expect(withTenant(db, { tenantId: "x'; DROP TABLE tenants;--" }, async () => 1)).rejects.toBeInstanceOf(
      InvalidTenantContextError,
    );
    await expect(withTenant(db, { userId: 'not-a-uuid' }, async () => 1)).rejects.toBeInstanceOf(
      InvalidTenantContextError,
    );
  });
});
