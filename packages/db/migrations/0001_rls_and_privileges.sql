-- Sécurité de la base : lien avec Supabase Auth, RLS (activée ET forcée), droits, journal d'audit en ajout seul.
-- Les politiques lisent le contexte posé par l'API à chaque transaction (voir packages/db/src/with-tenant.ts).

-- 1. Contraintes
ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_fk" FOREIGN KEY ("id") REFERENCES auth.users ("id");
ALTER TABLE "users" ADD CONSTRAINT "users_phone_e164_check" CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_check" CHECK ("role" IN ('owner', 'manager', 'cashier'));
--> statement-breakpoint

-- 2. Fonctions de contexte (jamais appelables via l'API de données Supabase)
CREATE FUNCTION app_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;
CREATE FUNCTION app_user_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE FUNCTION audit_logs_append_only() RETURNS trigger
  LANGUAGE plpgsql
  AS $$ BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END $$;
REVOKE ALL ON FUNCTION app_tenant_id(), app_user_id(), audit_logs_append_only() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_tenant_id(), app_user_id() TO laquinc_app;
--> statement-breakpoint

-- 3. Aucun accès par l'API de données Supabase (PostgREST) : droits retirés à anon et authenticated
REVOKE ALL ON "tenants", "users", "memberships", "audit_logs" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

-- 4. Droits du rôle applicatif (pas de DELETE : archivage logique ; audit_logs en ajout seul)
GRANT SELECT, INSERT, UPDATE ON "tenants", "users", "memberships" TO laquinc_app;
GRANT SELECT, INSERT ON "audit_logs" TO laquinc_app;
--> statement-breakpoint

-- 5. Row Level Security
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenants"
  USING (id = app_tenant_id())
  WITH CHECK (id = app_tenant_id());

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
-- Lecture : le tenant courant, ou ses propres memberships (choix du tenant après connexion).
CREATE POLICY memberships_select ON "memberships" FOR SELECT
  USING (tenant_id = app_tenant_id() OR user_id = app_user_id());
CREATE POLICY memberships_insert ON "memberships" FOR INSERT
  WITH CHECK (tenant_id = app_tenant_id());
CREATE POLICY memberships_update ON "memberships" FOR UPDATE
  USING (tenant_id = app_tenant_id())
  WITH CHECK (tenant_id = app_tenant_id());

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY users_select ON "users" FOR SELECT
  USING (
    id = app_user_id()
    OR EXISTS (SELECT 1 FROM "memberships" m WHERE m.user_id = "users".id AND m.tenant_id = app_tenant_id())
  );
CREATE POLICY users_insert ON "users" FOR INSERT
  WITH CHECK (id = app_user_id());
CREATE POLICY users_update ON "users" FOR UPDATE
  USING (id = app_user_id())
  WITH CHECK (id = app_user_id());

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_select ON "audit_logs" FOR SELECT
  USING (tenant_id = app_tenant_id());
CREATE POLICY tenant_isolation_insert ON "audit_logs" FOR INSERT
  WITH CHECK (tenant_id = app_tenant_id());
--> statement-breakpoint

-- 6. Journal d'audit : ni UPDATE, ni DELETE, ni TRUNCATE, quel que soit le rôle
CREATE TRIGGER audit_logs_no_update_delete BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();
CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_append_only();
