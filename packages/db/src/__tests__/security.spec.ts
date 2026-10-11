import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ADMIN_URL, APP_URL } from '../test/config';
import { seedWorld, type World } from '../test/seed';

let admin: postgres.Sql;
let app: postgres.Sql;
let w: World;

beforeAll(async () => {
  admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  app = postgres(APP_URL, { max: 1, onnotice: () => {} });
  w = await seedWorld(admin);
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe('application role', () => {
  it('is neither superuser nor BYPASSRLS, and owns no table', async () => {
    const [role] = await admin`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'laquinc_app'`;
    expect(role).toEqual({ rolsuper: false, rolbypassrls: false });
    const owned = await admin`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'laquinc_app'`;
    expect(owned).toEqual([]);
  });

  it('cannot disable row level security', async () => {
    await expect(app.unsafe('ALTER TABLE memberships DISABLE ROW LEVEL SECURITY')).rejects.toThrow();
    await expect(app.unsafe('ALTER TABLE memberships NO FORCE ROW LEVEL SECURITY')).rejects.toThrow();
  });

  it('cannot read tenant data without a context (RLS applies to a raw query too)', async () => {
    const rows = await app`SELECT id FROM memberships`;
    expect(rows).toEqual([]);
  });

  it('cannot create a policy-free table in public', async () => {
    await expect(app.unsafe('CREATE TABLE public.sneaky (id int)')).rejects.toThrow();
  });
});

describe('catalog guarantees', () => {
  it('every table in public has row level security enabled and forced, with at least one policy', async () => {
    const tables = await admin`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
             (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`;
    expect(tables.length).toBeGreaterThanOrEqual(4);
    for (const t of tables) {
      expect(t, `table ${String(t.relname)}`).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true });
      expect(t.policies, `policies on ${String(t.relname)}`).toBeGreaterThan(0);
    }
  });

  it('every table with a tenant_id column is covered', async () => {
    const rows = await admin`
      SELECT c.table_name FROM information_schema.columns c
      JOIN pg_class k ON k.relname = c.table_name AND k.relkind IN ('r','p')
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id'
        AND NOT (k.relrowsecurity AND k.relforcerowsecurity)`;
    expect(rows).toEqual([]);
  });

  it('anon and authenticated (Supabase Data API roles) have no privilege on any table or function in public', async () => {
    const tables = await admin`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    for (const { tablename } of tables) {
      for (const role of ['anon', 'authenticated']) {
        const [r] = await admin`
          SELECT has_table_privilege(${role}, ${'public.' + String(tablename)}, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') AS ok`;
        expect(r?.ok, `${role} on ${String(tablename)}`).toBe(false);
      }
    }
    const fns = await admin`
      SELECT p.oid::regprocedure::text AS fn FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'`;
    for (const { fn } of fns) {
      for (const role of ['anon', 'authenticated']) {
        const [r] = await admin`SELECT has_function_privilege(${role}, ${String(fn)}, 'EXECUTE') AS ok`;
        expect(r?.ok, `${role} on ${String(fn)}`).toBe(false);
      }
    }
  });
});

describe('audit_logs immutability', () => {
  it('rejects UPDATE and DELETE even for a privileged role (trigger)', async () => {
    await expect(admin`UPDATE audit_logs SET action = 'edited' WHERE id = ${w.auditA}`).rejects.toThrow(/append-only/i);
    await expect(admin`DELETE FROM audit_logs WHERE id = ${w.auditA}`).rejects.toThrow(/append-only/i);
  });
});
