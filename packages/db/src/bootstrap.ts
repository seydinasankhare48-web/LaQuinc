import type { Sql } from 'postgres';

export interface RolePasswords {
  app: string;
  migrator: string;
}

/**
 * Crée (ou remet d'aplomb) les rôles PostgreSQL de LaQuinc. À exécuter avec un rôle administrateur, hors
 * migrations : les mots de passe viennent de l'environnement, jamais d'un fichier versionné.
 *
 * - `laquinc_app` : utilisé par l'API. Ni superuser ni BYPASSRLS, ne possède aucune table.
 * - `laquinc_migrator` : utilisé pour appliquer les migrations (possède les tables).
 *
 * Idempotent : les attributs sont réappliqués à chaque exécution (un rôle modifié à la main est corrigé).
 * Le rôle de statistiques admin (lecture inter-tenants) viendra avec le back-office.
 */
export async function bootstrapRoles(admin: Sql, passwords: RolePasswords): Promise<void> {
  await admin.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'laquinc_app') THEN CREATE ROLE laquinc_app LOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'laquinc_migrator') THEN CREATE ROLE laquinc_migrator LOGIN; END IF;
    END $$;
  `);
  // Sur Supabase, `postgres` n'est pas superuser : il ne peut pas citer l'attribut SUPERUSER, même pour le refuser
  // (les rôles créés ci-dessus sont NOSUPERUSER par défaut). Un superuser le réapplique, pour corriger un rôle modifié.
  const [current] = await admin<
    { rolsuper: boolean }[]
  >`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;
  const rolsuper = current?.rolsuper ?? false;
  const noSuperuser = rolsuper ? 'NOSUPERUSER' : '';
  await admin.unsafe(
    `ALTER ROLE laquinc_app LOGIN ${noSuperuser} NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 50 PASSWORD ${quoteLiteral(passwords.app)}`,
  );
  await admin.unsafe(
    `ALTER ROLE laquinc_migrator LOGIN ${noSuperuser} NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 5 PASSWORD ${quoteLiteral(passwords.migrator)}`,
  );
  // ALTER DEFAULT PRIVILEGES FOR ROLE exige d'être membre du rôle : un administrateur non superuser (Supabase) doit
  // s'y rattacher avec l'héritage (un superuser n'en a pas besoin).
  if (!rolsuper)
    await admin.unsafe('GRANT laquinc_migrator TO CURRENT_USER WITH INHERIT TRUE, SET TRUE');
  await admin.unsafe(`
    REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
    GRANT USAGE ON SCHEMA public TO laquinc_app;
    GRANT USAGE, CREATE ON SCHEMA public TO laquinc_migrator;
    DO $$ BEGIN
      EXECUTE format('GRANT CREATE ON DATABASE %I TO laquinc_migrator', current_database());
    END $$;

    -- Les futures tables du migrator ne donnent aucun droit aux rôles de l'API de données Supabase.
    ALTER DEFAULT PRIVILEGES FOR ROLE laquinc_migrator IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE laquinc_migrator IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE laquinc_migrator IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

    -- La clé étrangère users.id -> auth.users(id) demande ces droits au migrator.
    DO $$ BEGIN
      IF to_regclass('auth.users') IS NOT NULL THEN
        BEGIN
          GRANT USAGE ON SCHEMA auth TO laquinc_migrator;
          GRANT REFERENCES ON auth.users TO laquinc_migrator;
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'Could not grant REFERENCES on auth.users to laquinc_migrator: grant it with a role that owns auth.users';
        END;
      END IF;
    END $$;
  `);
}

/**
 * Ajoute `users.id -> auth.users(id)` si la migration n'a pas pu le faire (sur Supabase, le migrator n'a pas
 * REFERENCES sur auth.users). À exécuter avec le rôle administrateur, après `bootstrapRoles` et les migrations :
 * membre de `laquinc_migrator`, il peut modifier `users` et détient lui-même REFERENCES. Idempotent.
 */
export async function ensureAuthUsersForeignKey(admin: Sql): Promise<void> {
  await admin.unsafe(`
    DO $$ BEGIN
      IF to_regclass('public.users') IS NOT NULL AND to_regclass('auth.users') IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_auth_users_fk' AND conrelid = 'public.users'::regclass) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_id_auth_users_fk FOREIGN KEY (id) REFERENCES auth.users (id);
      END IF;
    END $$;
  `);
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
