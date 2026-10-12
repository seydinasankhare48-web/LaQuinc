import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Sql } from 'postgres';
import { bootstrapRoles } from '../bootstrap';
import { ADMIN_URL, assertSafeTestDatabase } from './config';

const MIGRATIONS_FOLDER = new URL('../../migrations', import.meta.url).pathname;

/**
 * Remet la base de test dans l'état d'un projet Supabase vierge (faux schéma `auth`, rôles `anon`,
 * `authenticated` et `service_role`, privilèges par défaut du rôle `postgres`), crée nos rôles, puis
 * applique les migrations **avec `laquinc_migrator`**, comme en production.
 */
export async function resetTestDatabase(
  admin: Sql,
  migrator: Sql,
  passwords: { app: string; migrator: string },
  databaseUrl: string = ADMIN_URL,
): Promise<void> {
  assertSafeTestDatabase(databaseUrl);
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
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
    END $$;

    -- Comme Supabase : tout objet créé par postgres dans public est ouvert à anon/authenticated/service_role.
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
  `);
  await bootstrapRoles(admin, passwords);
  await migrate(drizzle(migrator), { migrationsFolder: MIGRATIONS_FOLDER });
}
