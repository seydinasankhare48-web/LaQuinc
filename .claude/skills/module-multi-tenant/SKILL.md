---
name: module-multi-tenant
description: Créer ou étendre un module métier LaQuinc (table, API NestJS, validation, tests) en respectant l'isolation par tenant, les rôles et les règles sur l'argent. À utiliser pour toute nouvelle ressource métier (ex. catalogue, fournisseurs, commandes).
---

# Créer un module métier multi-tenant

Suis les étapes dans l'ordre. Ne saute pas les tests.

## 1. Base de données (`packages/db`)

- Table en snake_case pluriel avec : `id uuid` (v7), `tenant_id uuid not null` (FK `tenants`),
  `created_at`, `updated_at`, `created_by`, `archived_at`.
- Montants `bigint` suffixe `_xof` ; quantités `numeric(12,3)` suffixe `_qty`.
- Index commençant par `tenant_id`.
- Dans la même migration :

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <table>
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

- Si la donnée touche à l'argent ou au stock : ajout seul (pas d'UPDATE/DELETE), corrections par écriture inverse.

## 2. Validation (`packages/validation`)

- Schémas Zod `create<Entity>Schema`, `update<Entity>Schema`, `list<Entity>QuerySchema`.
- Jamais de `tenant_id` dans les schémas d'entrée : il vient de la session.
- Montants : `z.number().int().nonnegative()`.

## 3. API (`apps/api/src/modules/<domaine>/`)

- `repository` : accès Drizzle uniquement via la transaction qui porte le contexte tenant.
- `service` : règles métier, erreurs typées, écriture dans `audit_logs` pour les actions sensibles.
- `controller` : décorateur de rôle sur chaque route, validation Zod, pagination sur les listes.
- Ressource d'un autre tenant → 404, jamais 403.

## 4. Tests (`__tests__/`)

- `<domaine>.service.spec.ts` : règles métier, cas limites (zéro, négatif, crédit dépassé…).
- `<domaine>.isolation.spec.ts` : deux tenants A et B ; A ne peut ni lister, ni lire, ni modifier,
  ni supprimer une ressource de B ; une création par A n'apparaît jamais chez B.
- Test de rôle : un `cashier` reçoit 403 sur les actions réservées.

## 5. Interface (`apps/web`)

- Composants de `packages/ui`, textes dans `packages/i18n`.
- États : chargement, vide, erreur, hors ligne.
- Si la ressource est publique (boutique) : voir `docs/seo.md`.

## 6. Fin

- `pnpm lint && pnpm typecheck && pnpm test`.
- Mettre à jour `docs/data-model.md` avec la nouvelle table.
- Proposer `/pre-merge`.
