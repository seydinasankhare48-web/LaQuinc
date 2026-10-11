# LaQuinc — instructions pour Claude Code

LaQuinc est un SaaS de gestion (stock, caisse, crédit client, devis/factures, boutique en ligne)
pour les quincailleries du Sénégal et d'Afrique francophone. Une marketplace viendra en phase 3.
Le développeur travaille seul : privilégie toujours la solution la plus simple qui respecte les règles ci-dessous.

## Avant de coder

- Lis `docs/progress.md` en début de session pour savoir où en est le projet.
- Lis le document de `docs/` qui concerne la tâche (voir l'index plus bas) avant de toucher au code.
- Pour toute feature qui touche plus de 2 fichiers : propose un plan, attends la validation, puis code.
- Si une demande sort du périmètre MVP défini dans `docs/plan.md`, signale-le avant de la faire.

## Stack

- Monorepo pnpm + Turborepo, TypeScript strict partout.
- `apps/web` : Next.js (App Router) + Tailwind + shadcn/ui, PWA — caisse, espace gérant, boutique publique.
- `apps/admin` : Next.js — back-office LaQuinc (admin.laquinc.sn).
- `apps/api` : NestJS, un module par domaine.
- `apps/worker` : BullMQ (PDF, WhatsApp/SMS, relances, statistiques nocturnes).
- `packages/db` : PostgreSQL + Drizzle, migrations, politiques RLS.
- Infrastructure : **Supabase** (PostgreSQL hébergé, Auth téléphone + OTP, MFA, Storage) ; la logique métier
  reste dans `apps/api`. La CLI Supabase sert à l'environnement local ; les migrations restent celles de Drizzle
  (voir `docs/decisions/0006-supabase.md`).
- `packages/validation` : schémas Zod partagés front/back.
- `packages/payments`, `packages/invoicing`, `packages/ui`, `packages/i18n`.

## Règles non négociables

1. **Multi-tenant** : chaque table métier a une colonne `tenant_id` et une politique Row Level Security.
   Aucune requête ne contourne la RLS. Le tenant vient de la membership de l'utilisateur authentifié
   (JWT Supabase vérifié), jamais d'une valeur envoyée par le client sans vérification. Chaque nouveau
   module a un test qui prouve qu'un tenant ne peut ni lire ni modifier les données d'un autre.
2. **Argent** : montants en entiers FCFA (`integer`/`bigint`, jamais de float). Quantités en
   `numeric(12,3)` (2,5 m de câble). Le franc CFA n'a pas de centimes.
3. **Stock et dettes** : jamais un champ qu'on écrase. Le stock = somme des `stock_movements`,
   la dette client = somme des `customer_ledger_entries`. Les totaux en cache sont recalculables.
4. **Factures** : numérotation séquentielle par tenant sans trou, immuables une fois émises.
   Une correction = un avoir. Jamais d'`UPDATE` ni de `DELETE` sur une facture émise.
5. **Validation** : toute entrée (body, query, params, webhook) passe par un schéma Zod.
6. **Permissions** : vérifiées côté serveur sur chaque endpoint (rôles `owner`, `manager`, `cashier`).
   Changer un prix, faire une remise au-delà du seuil, annuler une vente, ajuster le stock :
   gérant uniquement, et écrit dans `audit_logs`.
7. **Secrets** : uniquement en variables d'environnement. Ne lis jamais les fichiers `.env`.
   Les clés API des quincailleries (agrégateur de paiement) sont chiffrées en base.
   La clé Supabase `service_role` contourne la RLS : voir les règles Supabase ci-dessous.
8. **Paiements** : une commande est payée uniquement sur webhook vérifié (signature + idempotence),
   jamais sur la redirection du client. Tout passe par l'interface `PaymentProvider`.
9. **Hors ligne** : la caisse doit fonctionner sans réseau. Les identifiants des ventes sont des
   UUID générés sur l'appareil. Toute nouvelle logique de vente doit rester rejouable à la synchronisation.
10. **Suppression** : archivage logique (`archived_at`) pour tout ce qui touche à l'argent ou au stock.

## Règles Supabase

S1. Le front et la caisse n'accèdent **jamais** directement aux tables métier : ventes, stock, crédit,
    factures, paiements passent par l'API. Le SDK Supabase côté client sert uniquement à la connexion.
S2. L'API vérifie le JWT Supabase (JWKS, `iss`, `exp`, `aal`), puis ouvre une transaction et exécute
    `set_config('app.tenant_id', …, true)` avec un rôle PostgreSQL dédié **sans** `BYPASSRLS`.
    Les politiques RLS restent basées sur `app.tenant_id`.
S3. Le tenant actif n'est jamais cru sur parole : s'il vient du client, l'API vérifie la membership de
    l'utilisateur avant de l'appliquer.
S4. Les tables métier ne sont pas exposées par l'API de données Supabase (PostgREST) : chaque migration
    de table métier retire les droits à `anon` et `authenticated`, et le schéma n'est pas exposé.
S5. La clé `service_role` n'existe que dans les variables d'environnement du worker et du calcul des
    stats admin. Jamais dans `apps/web`, ni côté navigateur de `apps/admin`, ni dans la caisse.
S6. Storage : buckets privés par défaut, accès par URL signées générées par l'API ; seul le bucket des
    photos de la boutique publique est public.
S7. `users.id = auth.users.id` ; nos tables `users` et `memberships` restent la source des rôles.
    Le PIN caisse reste dans notre base, haché.
S8. Sauvegardes : celles de Supabase + un export `pg_dump` mensuel avec test de restauration
    (les fichiers Storage ne sont pas dans les sauvegardes de la base : export séparé).

## Interface et SEO

- Mobile d'abord, utilisable sur un Android d'entrée de gamme, pages légères.
- Textes en français simple, toujours via `packages/i18n` (le wolof arrivera plus tard) : pas de texte en dur dans les composants.
- Pages publiques (vitrines, fiches produits) : rendu serveur, métadonnées, données structurées
  schema.org, sitemap. Caisse, espace gérant et admin : `noindex`. Détails : `docs/seo.md`.
- Pour toute nouvelle interface, utilise le skill frontend-design et les composants de `packages/ui`.

## Tests et qualité

- Chaque feature : tests unitaires + au moins un test e2e Playwright sur le parcours principal.
- Écris d'abord les tests des règles métier critiques (isolation tenant, calcul de stock, numérotation des factures).
- Avant de déclarer une tâche terminée : `pnpm lint`, `pnpm typecheck`, `pnpm test` doivent passer.
- Avant chaque merge : `/pre-merge`.

## Fin de session

- Mets à jour `docs/progress.md` (fait, en cours, prochaine étape, décisions prises).
- Une décision d'architecture nouvelle → un ADR dans `docs/decisions/` via `/adr`.

## Index de la documentation

| Fichier | À lire quand tu touches à… |
| --- | --- |
| `docs/plan.md` | Périmètre, priorités, planning, ce qui est reporté |
| `docs/architecture.md` | Structure du dépôt, hors ligne, hébergement |
| `docs/data-model.md` | Base de données, nouvelles tables, migrations |
| `docs/security.md` | Auth, rôles, RLS, audit, sauvegardes |
| `docs/payments.md` | Encaissements, agrégateur, webhooks, abonnements |
| `docs/invoicing.md` | Devis, factures, avoirs, conformité DGID |
| `docs/seo.md` | Pages publiques, boutique en ligne, marketplace |
| `docs/admin.md` | Back-office LaQuinc, indicateurs, abonnés |
| `docs/conventions.md` | Nommage, git, structure des modules, style |
| `docs/decisions/` | Pourquoi un choix a été fait |
