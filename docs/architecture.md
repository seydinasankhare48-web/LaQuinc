# Architecture

Un monorepo TypeScript, une API, une base PostgreSQL partagée (hébergée par Supabase) où chaque quincaillerie
(tenant) est isolée par `tenant_id` + Row Level Security. Supabase fournit l'infrastructure (base, connexion,
fichiers) ; la logique métier reste dans `apps/api` (voir ADR 0006). Le modèle le plus simple à maintenir seul ; il tient jusqu'à
plusieurs milliers de clients sans changement.

## Vue d'ensemble

```
 Caisse (PWA, hors ligne) ─┐   connexion seulement (SDK)
 Espace gérant ────────────┼──────────────────────────► Supabase Auth (téléphone + OTP, MFA admin)
 Boutique publique (SSR) ──┤                                   │ JWT
 apps/admin (back-office) ─┘                                   ▼
        └── toutes les données ──► apps/api (NestJS) ──► PostgreSQL Supabase (RLS)
                                      │   ▲               Supabase Storage (photos, PDF)
                                      │   └── webhook signé ── Agrégateur de paiement
                                      └──► Redis + apps/worker ──► WhatsApp / SMS
```

## Structure du dépôt

```
laquinc/
├── apps/
│   ├── web/        Next.js : (pos) caisse, (dashboard) espace gérant, (shop) boutique publique
│   ├── admin/      Next.js : back-office LaQuinc, admin.laquinc.sn
│   ├── api/        NestJS : un module par domaine
│   └── worker/     BullMQ : PDF, messages, relances, statistiques nocturnes
├── packages/
│   ├── db/         schéma Drizzle, migrations, politiques RLS, seeds
│   ├── validation/ schémas Zod partagés
│   ├── payments/   interface PaymentProvider + adaptateurs agrégateurs
│   ├── invoicing/  numérotation, génération PDF, export e-facture
│   ├── ui/         design system (shadcn/ui personnalisé)
│   ├── i18n/       fr (puis wolof)
│   └── config/     eslint, tsconfig, tailwind partagés
├── tests/e2e/      Playwright
└── docs/
```

## Build et exécution de l'API

Les paquets du workspace (`@laquinc/*`) sont en TypeScript source : l'API est bundlée avec `tsup`
(`pnpm --filter @laquinc/api build` → `dist/main.js`, `start` pour l'exécuter), `tsx watch` en développement.
L'injection NestJS utilise des `@Inject(Jeton)` explicites (l'outillage de test n'émet pas les métadonnées de décorateurs).

## Modules de l'API (`apps/api/src/modules/`)

`auth`, `tenants`, `users`, `catalog`, `stock`, `sales`, `customers` (crédit), `quotes`, `invoices`,
`online-orders`, `payments`, `subscriptions`, `audit`, `admin`, `sync` (caisse hors ligne).

Chaque module suit la même forme (voir le skill `module-multi-tenant`) :
`controller` → `service` → `repository` (Drizzle), schémas Zod dans `packages/validation`, tests à côté.

## Contexte tenant

1. Le guard d'auth vérifie le JWT Supabase (signature via le JWKS du projet, `iss`, `exp`), puis résout
   l'utilisateur (`sub` = `users.id`) et sa `membership` (tenant + rôle). Si le client indique un tenant
   (ex. en-tête `X-Tenant-Id`), l'API vérifie que l'utilisateur en est membre avant de l'appliquer.
2. Chaque requête ouvre une transaction et exécute `SELECT set_config('app.tenant_id', $1, true)`
   (portée limitée à la transaction ; ne jamais concaténer l'UUID dans la requête SQL).
3. Les politiques RLS filtrent sur `current_setting('app.tenant_id')`.
4. L'application se connecte avec un rôle PostgreSQL dédié **sans** `BYPASSRLS` (pas `postgres`, pas
   `service_role`). Seules les migrations et le calcul nocturne des statistiques admin utilisent un rôle
   dédié, jamais exposé à une requête HTTP.
5. Les tables métier ne sont pas exposées par l'API de données Supabase (PostgREST) : droits retirés à
   `anon` et `authenticated`, schéma non exposé (voir `docs/security.md`).

## Caisse hors ligne

- Catalogue, prix et clients mis en cache sur l'appareil (IndexedDB) au démarrage et après chaque synchro.
- Chaque vente reçoit un UUID généré sur l'appareil et entre dans une file locale.
- Au retour du réseau, `POST /sync/sales` envoie les ventes ; le serveur les rejoue de façon idempotente
  (même UUID = même vente, jamais de doublon).
- Un stock qui devient négatif après synchro n'est pas bloqué : il est signalé au gérant.
- La file locale survit à un redémarrage du téléphone.

## Hébergement

- Front (`web`, `admin`) : Vercel. API, worker, Redis : Railway, Render ou Fly (hébergeur à choisir).
- Base, authentification et fichiers : Supabase, région Europe de l'Ouest (région exacte à confirmer à la
  création du projet), offre Pro minimale pour les sauvegardes quotidiennes.
- Local : CLI Supabase (`supabase start`, Docker) pour la base, l'auth et le stockage ; Redis via `docker compose`.
- Environnements : `local`, `staging` (déployé à chaque merge sur `main`), `production` (tag de version).
- Sauvegardes : Supabase + export `pg_dump` mensuel, test de restauration mensuel (voir `docs/security.md`).
- Tests de base en CI : PostgreSQL avec un faux schéma `auth` (`auth.users` minimal) ; la CLI Supabase
  locale sert de contrôle de conformité.

## Choix structurants

Voir `docs/decisions/` : monorepo TypeScript (0001), multi-tenant RLS (0002), agrégateur de paiement (0003),
caisse hors ligne (0004), montants en entiers FCFA (0005), Supabase comme infrastructure (0006).
