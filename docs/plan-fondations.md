# Plan — Semaines 1–2 · Fondations

Statut : **proposé, en attente de validation** (règle de `CLAUDE.md` : plan avant code pour toute feature de plus de 2 fichiers).

## Objectif

À la fin des deux semaines : un monorepo qui build, une CI verte, un utilisateur qui se connecte par téléphone + OTP,
des tenants et des rôles, la RLS prouvée par des tests d'isolation, et un staging déployé.
Aucune fonctionnalité métier (catalogue, caisse…) : elle commence en semaine 3.

## Décisions à trancher avant de coder

| Sujet | Proposition | Pourquoi |
| --- | --- | --- |
| Type des montants | `bigint` partout (précise `CLAUDE.md`) | Aligné sur `data-model.md` et l'ADR 0005 |
| « Gérant » dans les règles | = `owner` **et** `manager` | Aligné sur `security.md` |
| Identifiants | UUID v7 | Générable sur l'appareil (caisse hors ligne) |
| Fournisseur OTP (SMS/WhatsApp) | Interface `OtpSender` + adaptateur « console » en local ; choix du fournisseur reporté | Évite de bloquer sur un contrat ; même principe que `PaymentProvider` |
| Test DB | PostgreSQL réel via Docker (pas de mock) | La RLS ne se teste pas avec un mock |
| ORM / migrations | Drizzle + Drizzle Kit, RLS en SQL écrit à la main dans les migrations | Drizzle ne génère pas les politiques RLS de façon fiable |
| Tests | Vitest (unitaires), Playwright (e2e) | Simple, rapide, TS natif |

## Étape 1 — Monorepo (jour 1–2)

Fichiers : `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.env.example`, `.nvmrc`,
`docker-compose.yml` (PostgreSQL 16 + Redis), `packages/config` (tsconfig strict, eslint, prettier).
Squelettes vides mais qui compilent : `apps/api` (NestJS), `apps/web` (Next.js), `apps/admin`, `apps/worker`,
`packages/db`, `packages/validation`, `packages/i18n`, `packages/ui`.
`git init` dans `laquinc/`, premier commit `chore: init monorepo`. Suppression de la copie externe de `CLAUDE.md` à valider avec vous.
Critère : `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` passent.

## Étape 2 — CI (jour 2–3)

GitHub Actions : lint, typecheck, test (avec service PostgreSQL), build ; cache Turborepo ; `pnpm audit` ;
Dependabot. Critère : une PR de test est verte.

## Étape 3 — Base et RLS (jour 3–6) — tests d'abord

`packages/db` :
- Rôles PostgreSQL : `laquinc_app` (sans `BYPASSRLS`), `laquinc_migrator`, `laquinc_stats` (réservé au calcul nocturne).
- Tables : `tenants`, `users`, `memberships`, `otp_challenges`, `audit_logs` (ajout seul : `REVOKE UPDATE, DELETE` pour `laquinc_app`).
- Politiques RLS sur `memberships` et `audit_logs` (`current_setting('app.tenant_id')`) ; `tenants` filtrée sur son propre `id`.
- Helper `withTenant(tenantId, fn)` : transaction + `set_config('app.tenant_id', $1, true)`.
- **Tests d'isolation d'abord** : le tenant A ne lit, ne modifie, ne supprime rien du tenant B ; sans contexte tenant, zéro ligne ;
  `laquinc_app` ne peut pas désactiver la RLS.
Critère : tests d'isolation écrits, rouges, puis verts après les migrations.

## Étape 4 — API : auth, tenants, rôles (jour 6–10)

Modules NestJS `auth`, `tenants`, `users`, `audit` (forme du skill `module-multi-tenant`).
- `POST /auth/otp/request`, `POST /auth/otp/verify` : OTP 6 chiffres, 5 min, 5 tentatives, limitation de débit par numéro et par IP, haché en base.
- Sessions courtes + refresh ; numéros en E.164 ; PIN caisse (haché) reporté à la semaine 5.
- `POST /tenants` (inscription d'une quincaillerie : crée tenant + user + membership `owner`).
- Guard d'auth → membership → `withTenant` par requête ; décorateur `@Roles()` ; filtre d'erreurs métier unique.
- Schémas Zod dans `packages/validation` pour chaque entrée.
- Tests unitaires par service + un `*.isolation.spec.ts` par module (réponse 404, jamais 403, sur ressource d'un autre tenant).
- Revue par l'agent `tenant-security-reviewer`.

## Étape 5 — Web minimal (jour 10–12)

`apps/web` : écrans connexion (téléphone → code) et inscription d'une quincaillerie, textes dans `packages/i18n` (fr),
`noindex`, quatre états (chargement, vide, erreur, hors ligne), mobile d'abord.
Un e2e Playwright : inscription → déconnexion → reconnexion par OTP.

## Étape 6 — Staging (jour 12–14)

Déploiement automatique de `main` : front sur Vercel, API + PostgreSQL + Redis chez l'hébergeur retenu (Railway/Render/Fly à choisir),
variables d'environnement hors dépôt, sauvegarde quotidienne chiffrée activée.
Fin de session : `docs/progress.md` à jour, ADR pour tout choix nouveau (OTP, hébergeur, tests).

## Hors périmètre de ces deux semaines

Catalogue, stock, caisse, PIN caisse, back-office, 2FA admin, boutique, paiements. `apps/admin` et `apps/worker` restent des squelettes.

## Risques

- Hébergeur et fournisseur OTP non choisis : traités par interfaces et adaptateurs, pas bloquants avant l'étape 6.
- Migrations RLS écrites à la main : un test de contrôle vérifie que **toute** table avec `tenant_id` a la RLS activée et forcée.
