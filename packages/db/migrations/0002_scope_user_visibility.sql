-- Cloisonnement renforcé (revue sécurité de l'API) : la vue « mes memberships / mes tenants » sert uniquement à
-- choisir le tenant après la connexion, c'est-à-dire quand AUCUN tenant n'est encore dans le contexte.
-- Dès qu'un tenant est actif, seules ses lignes sont visibles : une requête qui oublierait de filtrer par
-- tenant_id ne voit plus les autres tenants de l'utilisateur.

DROP POLICY memberships_select ON "memberships";
CREATE POLICY memberships_select ON "memberships" FOR SELECT
  USING (
    tenant_id = (SELECT app_tenant_id())
    OR ((SELECT app_tenant_id()) IS NULL AND user_id = (SELECT app_user_id()))
  );
--> statement-breakpoint

-- Sans tenant actif, un utilisateur voit les tenants dont il est membre actif (une seule requête pour /me).
DROP POLICY tenants_select ON "tenants";
CREATE POLICY tenants_select ON "tenants" FOR SELECT
  USING (
    id = (SELECT app_tenant_id())
    OR (
      (SELECT app_tenant_id()) IS NULL
      AND EXISTS (
        SELECT 1 FROM "memberships" m
        WHERE m.tenant_id = "tenants".id AND m.user_id = (SELECT app_user_id()) AND m.archived_at IS NULL
      )
    )
  );
