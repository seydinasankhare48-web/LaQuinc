import type { Sql } from 'postgres';

export interface RolePasswords {
  app: string;
  migrator: string;
}

/**
 * Crée (ou met à jour) les rôles PostgreSQL de LaQuinc. À exécuter avec un rôle administrateur, hors
 * migrations : les mots de passe viennent de l'environnement, jamais d'un fichier versionné.
 *
 * - `laquinc_app` : utilisé par l'API. Ni superuser ni BYPASSRLS, ne possède aucune table.
 * - `laquinc_migrator` : utilisé pour appliquer les migrations (possède les tables).
 *
 * Le rôle de statistiques admin (lecture inter-tenants) viendra avec le back-office.
 */
export async function bootstrapRoles(admin: Sql, passwords: RolePasswords): Promise<void> {
  await admin.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'laquinc_app') THEN
        CREATE ROLE laquinc_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'laquinc_migrator') THEN
        CREATE ROLE laquinc_migrator LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
      END IF;
    END $$;
  `);
  await admin.unsafe(`ALTER ROLE laquinc_app PASSWORD ${quoteLiteral(passwords.app)}`);
  await admin.unsafe(`ALTER ROLE laquinc_migrator PASSWORD ${quoteLiteral(passwords.migrator)}`);
  await admin.unsafe(`
    GRANT USAGE ON SCHEMA public TO laquinc_app;
    GRANT USAGE, CREATE ON SCHEMA public TO laquinc_migrator;
  `);
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
