import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Sql } from 'postgres';
import { bootstrapRoles } from '../bootstrap';

const MIGRATIONS_FOLDER = new URL('../../migrations', import.meta.url).pathname;

/**
 * Remet la base de test dans l'état d'un projet Supabase vierge (faux schéma `auth`, rôles `anon` et
 * `authenticated` avec privilèges par défaut sur `public`), puis applique les migrations.
 */
export async function resetTestDatabase(
  admin: Sql,
  passwords: { app: string; migrator: string },
): Promise<void> {
  await admin.unsafe(`
    DROP SCHEMA IF EXISTS public CASCADE;
    DROP SCHEMA IF EXISTS drizzle CASCADE;
    DROP SCHEMA IF EXISTS auth CASCADE;
    CREATE SCHEMA public;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, phone text);

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    END $$;

    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
  `);
  await bootstrapRoles(admin, passwords);
  await migrate(drizzle(admin), { migrationsFolder: MIGRATIONS_FOLDER });
}
