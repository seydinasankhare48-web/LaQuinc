-- Sécurité de la base : lien avec Supabase Auth, RLS (activée ET forcée), droits, journal d'audit en ajout seul.
-- Les politiques lisent le contexte posé par l'API à chaque transaction (voir packages/db/src/with-tenant.ts) :
-- app.tenant_id, app.user_id et app.role (rôle de la membership déjà vérifiée par l'API).

-- 1. Contraintes
-- Sur Supabase, le migrator n'a pas le droit REFERENCES sur auth.users (qu'`postgres` ne peut pas lui transmettre) :
-- la clé étrangère est alors ajoutée par `db:migrate` avec le rôle administrateur (ensureAuthUsersForeignKey).
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_fk" FOREIGN KEY ("id") REFERENCES auth.users ("id");
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'users_id_auth_users_fk not created: no REFERENCES on auth.users for this role';
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_e164_check" CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_check" CHECK ("role" IN ('owner', 'manager', 'cashier'));
--> statement-breakpoint

-- 2. Fonctions de contexte (jamais appelables via l'API de données Supabase)
CREATE FUNCTION app_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;
CREATE FUNCTION app_user_id() RETURNS uuid
  LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE FUNCTION app_role() RETURNS text
  LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT nullif(current_setting('app.role', true), '') $$;
CREATE FUNCTION audit_logs_append_only() RETURNS trigger
  LANGUAGE plpgsql SET search_path = ''
  AS $$ BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END $$;
CREATE FUNCTION audit_logs_set_created_at() RETURNS trigger
  LANGUAGE plpgsql SET search_path = ''
  AS $$ BEGIN NEW.created_at := now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app_tenant_id(), app_user_id(), app_role(), audit_logs_append_only(), audit_logs_set_created_at()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_tenant_id(), app_user_id(), app_role() TO laquinc_app;
--> statement-breakpoint

-- 3. Aucun accès par l'API de données Supabase (PostgREST)
REVOKE ALL ON "tenants", "users", "memberships", "audit_logs" FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

-- 4. Droits du rôle applicatif : pas de DELETE (archivage logique) ; audit_logs en ajout seul ;
--    le téléphone d'un utilisateur ne se change que par Supabase Auth.
GRANT SELECT, INSERT, UPDATE ON "tenants", "memberships" TO laquinc_app;
GRANT SELECT, INSERT ON "users" TO laquinc_app;
GRANT UPDATE ("full_name", "updated_at") ON "users" TO laquinc_app;
GRANT SELECT, INSERT ON "audit_logs" TO laquinc_app;
--> statement-breakpoint

-- 5. Row Level Security. `(SELECT app_...())` : évalué une fois par requête (initplan), pas par ligne.
--    Écrire = propriétaire (`owner`) : gestion des utilisateurs et des paramètres (docs/security.md).
--    L'inscription s'exécute avec app.role = 'owner' pour le tenant qui vient d'être créé.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenants_select ON "tenants" FOR SELECT
  USING (id = (SELECT app_tenant_id()));
CREATE POLICY tenants_insert ON "tenants" FOR INSERT
  WITH CHECK (id = (SELECT app_tenant_id()) AND (SELECT app_role()) = 'owner');
CREATE POLICY tenants_update ON "tenants" FOR UPDATE
  USING (id = (SELECT app_tenant_id()) AND (SELECT app_role()) = 'owner')
  WITH CHECK (id = (SELECT app_tenant_id()) AND (SELECT app_role()) = 'owner');

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
-- Lecture : le tenant courant, ou ses propres memberships (choix du tenant après connexion).
CREATE POLICY memberships_select ON "memberships" FOR SELECT
  USING (tenant_id = (SELECT app_tenant_id()) OR user_id = (SELECT app_user_id()));
CREATE POLICY memberships_insert ON "memberships" FOR INSERT
  WITH CHECK (tenant_id = (SELECT app_tenant_id()) AND (SELECT app_role()) = 'owner');
CREATE POLICY memberships_update ON "memberships" FOR UPDATE
  USING (tenant_id = (SELECT app_tenant_id()) AND (SELECT app_role()) = 'owner')
  WITH CHECK (tenant_id = (SELECT app_tenant_id()) AND (SELECT app_role()) = 'owner');

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY users_select ON "users" FOR SELECT
  USING (
    id = (SELECT app_user_id())
    OR EXISTS (SELECT 1 FROM "memberships" m WHERE m.user_id = "users".id AND m.tenant_id = (SELECT app_tenant_id()))
  );
CREATE POLICY users_insert ON "users" FOR INSERT
  WITH CHECK (id = (SELECT app_user_id()));
CREATE POLICY users_update ON "users" FOR UPDATE
  USING (id = (SELECT app_user_id()))
  WITH CHECK (id = (SELECT app_user_id()));

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_select ON "audit_logs" FOR SELECT
  USING (tenant_id = (SELECT app_tenant_id()));
-- On ne peut journaliser qu'en son propre nom.
CREATE POLICY audit_logs_insert ON "audit_logs" FOR INSERT
  WITH CHECK (tenant_id = (SELECT app_tenant_id()) AND actor_user_id = (SELECT app_user_id()));
--> statement-breakpoint

-- 6. Journal d'audit : ni UPDATE, ni DELETE, ni TRUNCATE quel que soit le rôle ; date toujours posée par la base
CREATE TRIGGER audit_logs_no_update_delete BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();
CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_append_only();
CREATE TRIGGER audit_logs_created_at BEFORE INSERT ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_set_created_at();
