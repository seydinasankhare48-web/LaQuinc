# Journal d'avancement

Mis à jour à la fin de chaque session de travail (commande `/fin-de-session`).
Claude Code le lit en début de session. Les entrées les plus récentes sont en haut.

## État actuel

- **Phase** : 1 · MVP gestion
- **Bloc en cours** : Semaines 1–2 · Fondations (étapes 1–5 faites — voir `docs/plan-fondations.md`)
- **Prochaine étape** : étape 6 du plan des Fondations (staging : Vercel, hébergeur de l'API, projet Supabase)
- **Bloquants** : aucun

## Checklist du MVP

- [ ] Semaines 1–2 · Fondations (monorepo, CI, Supabase Auth + vérification JWT, tenants, rôles, RLS + tests d'isolation, staging)
- [ ] Semaines 3–4 · Catalogue et stock
- [ ] Semaines 5–6 · Caisse hors ligne
- [ ] Semaine 7 · Clients et crédit
- [ ] Semaine 8 · Devis et factures
- [ ] Semaines 9–10 · Boutique en ligne + SEO + paiement
- [ ] Semaine 11 · Tableau de bord, audit, abonnement, back-office minimal
- [ ] Semaine 12 · Durcissement et installation chez les pilotes

## Hors code

- [ ] 3 à 5 quincailleries pilotes identifiées
- [ ] Catalogues des pilotes récupérés
- [ ] NINEA / RCCM de l'entreprise LaQuinc
- [ ] Compte marchand chez l'agrégateur choisi
- [ ] Rendez-vous expert-comptable (facturation, TVA)
- [ ] Rendez-vous juriste (CGU, CDP)
- [ ] Créer le projet Supabase (région Europe de l'Ouest, offre Pro)
- [ ] Choisir le fournisseur SMS (coût et délivrabilité vers Orange, Free, Expresso)
- [ ] Domaines `laquinc.sn` et `laquinc.com`
- [ ] Dépôt de la marque à l'OAPI

## Sessions

<!-- Modèle d'entrée :
### AAAA-MM-JJ
- Fait :
- En cours :
- Décisions : (lien vers l'ADR)
- Prochaine étape :
-->

### 2026-10-12 (étape 5 · web)
- Fait : `apps/web` — connexion par téléphone + code OTP (Supabase JS dans le navigateur, session gardée côté navigateur), inscription de la quincaillerie, choix de la quincaillerie, accueil minimal et déconnexion ; états chargement / erreur / hors ligne ; redirections par état (`Guard`) ; client API typé (erreurs traduites via `packages/i18n`) ; Tailwind v4 et composants `packages/ui` (Button, Field, Alert, Spinner) ; pages `noindex`. 30 tests unitaires web ; 4 e2e Playwright (parcours inscription → déconnexion → reconnexion, code incorrect, numéro invalide, hors ligne) sur un écran mobile, avec la vraie API, la vraie base et un faux Supabase Auth ; job `e2e` en CI.
- Décisions : session dans le navigateur (pas de cookies serveur) ; faux Supabase Auth pour les e2e ; composants maison.
- À vérifier au staging : comportement du vrai GoTrue (codes d'erreur, expiration de l'OTP, format du téléphone dans le JWT).
- Demandé : connexion Google. Hors périmètre MVP (`docs/plan.md`) et impact sur le modèle (un compte Google n'a pas de téléphone) : en attente d'une décision de conception.

### 2026-10-12 (étape 4 · API)
- Fait : `apps/api` — vérification du JWT Supabase (JWKS, `iss`, `aud`, `exp`, algorithmes asymétriques seulement), résolution du tenant par membership (`X-Tenant-Id` vérifié, memberships et tenants archivés ignorés), `@Roles`, `POST /tenants` (inscription transactionnelle + audit), `GET /me`, `GET/PATCH /tenants/current`, `GET /memberships`, `PATCH /memberships/:id`, `POST /memberships/:id/archive` (pas d'auto-modification, dernier owner protégé par verrou), filtre d'erreurs unique, validation Zod (`packages/validation`), helmet, CORS, limitation de débit, règle ESLint contre `sql.raw`/`.unsafe`. 45 tests API (JWT, rôles, isolation, inscription, garde-fous, démarrage sans providers factices, déclaration d'accès de chaque route) ; vérifiés par mutation. Revue sécurité : cloisonnement des memberships/tenants dans la RLS (migration 0002) et filtres explicites, `/me` et la résolution du tenant en une transaction, limite de 3 quincailleries par propriétaire, refus par défaut des routes non déclarées, logs sans PII, `TRUST_PROXY`, `.strict()` sur les schémas, sessions anonymes refusées.
- Décisions : bundle `tsup` + `@Inject` explicites ; `turbo` exécute les tests des paquets dépendants de `@laquinc/db` après ceux de `db` (même base de test). Limite : cette étape a été codée avant ses tests (écart à la règle « tests d'abord », compensé par des tests de mutation).
- À surveiller : « dernier owner » protégé par verrou applicatif seulement (envisager une contrainte en base) ; limitation de débit par utilisateur (aujourd'hui par IP).
- Reste à faire : invitation d'un membre par téléphone (demande une conception : la RLS interdit de chercher un utilisateur sans membership) ; test de la limitation de débit (désactivée en test) ; `aal2` pour l'admin (semaine 11) ; vérifier sur un vrai JWT Supabase le format du téléphone et `aud`.

### 2026-10-12 (étape 3 · base et RLS)
- Fait : `packages/db` (schéma Drizzle `tenants`, `users`, `memberships`, `audit_logs`), migrations avec RLS activée et forcée, `REVOKE` pour `anon`/`authenticated`, `audit_logs` en ajout seul (droits + trigger), rôles `laquinc_app` et `laquinc_migrator`, helper `withTenant`. 46 tests (isolation, rôles, garde-fous du catalogue, fuite de contexte, escalade de rôle) ; vérifiés en cassant volontairement des politiques. Revue sécurité : escalade de rôle intra-tenant corrigée (contexte `app.role`), `audit_logs` non falsifiable, PIN retiré de `memberships`, migrations testées avec `laquinc_migrator`, garde-fou contre le reset d'une base non-test.
- Décisions : contexte `app.tenant_id` + `app.user_id` (voir `docs/data-model.md`) ; rôle de stats reporté à la semaine 11 (BYPASSRLS demande un superuser, à vérifier sur Supabase) ; `postgres-test` sur le port 54330.
- À vérifier : MFA TOTP sur l'offre gratuite (le `config.toml` de la CLI indique « Pro ») ; pooler Supabase en mode transaction ; droit `REFERENCES` du migrator sur `auth.users` en production.

- Reste à faire : tester `supabase start` en local (disque à 97 %, images partiellement téléchargées ~1,2 Go : à libérer avant) ; `archived_at` des memberships/tenants à appliquer côté API ; règle ESLint contre `sql.raw`/`unsafe`.

### 2026-10-11 (soir, Supabase)
- Fait : adoption de Supabase comme infrastructure (ADR 0006) ; documentation, `CLAUDE.md`, skill, agent et `/pre-merge` mis à jour ; plugins installés (frontend-design, security-guidance, superpowers, code-review, context7).
- Décisions : [ADR 0006](decisions/0006-supabase.md). Data API désactivée si compatible (à tester), sinon schéma non exposé + `REVOKE` ; faux schéma `auth` en CI.
- À faire plus tard (hors docs) : retirer PostgreSQL de `docker-compose.yml`, ajouter les variables Supabase à `.env.example`, adapter la base de test dans `.github/workflows/ci.yml`.
- Prochaine étape : merger les PR (CI puis docs), puis étape 3 (base et RLS).

### 2026-10-11 (soir, suite)
- Fait : étape 2 — CI GitHub Actions (lint, typecheck, test avec PostgreSQL 16, build, `pnpm audit`) et Dependabot, PR #1 verte (branche `chore/ci`).
- Prochaine étape : merger la PR #1 après `/pre-merge`, puis étape 3.

### 2026-10-11 (soir)
- Fait : étape 1 des Fondations — monorepo pnpm/Turborepo, squelettes apps et packages, `git init`, commit `chore: init monorepo`. `lint`, `typecheck`, `test`, `build` passent.
- Décisions : TypeScript épinglé en 6.0.x (typescript-eslint ne supporte pas encore TS 7) ; `apps/api` et `apps/worker` en ESM (NestJS 12), imports relatifs avec extension `.js`.
- Prochaine étape : CI (étape 2), puis base et RLS (étape 3).

### 2026-10-11
- Fait : plan du produit, documentation initiale, configuration Claude Code.
- Prochaine étape : créer le dépôt et lancer les Fondations.
