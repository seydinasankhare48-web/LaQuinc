# Architecture

Un monorepo TypeScript, une API, une base PostgreSQL partagée où chaque quincaillerie (tenant) est isolée
par `tenant_id` + Row Level Security. Le modèle le plus simple à maintenir seul ; il tient jusqu'à
plusieurs milliers de clients sans changement.

## Vue d'ensemble

```
 Caisse (PWA, hors ligne) ─┐
 Espace gérant ────────────┼──► apps/api (NestJS) ──► PostgreSQL (RLS)
 Boutique publique (SSR) ──┘         │   ▲            Redis + apps/worker ──► WhatsApp / SMS
 apps/admin (back-office) ───────────┘   │            Stockage S3 (photos, PDF)
                                         └── webhook signé ── Agrégateur de paiement
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

## Modules de l'API (`apps/api/src/modules/`)

`auth`, `tenants`, `users`, `catalog`, `stock`, `sales`, `customers` (crédit), `quotes`, `invoices`,
`online-orders`, `payments`, `subscriptions`, `audit`, `admin`, `sync` (caisse hors ligne).

Chaque module suit la même forme (voir le skill `module-multi-tenant`) :
`controller` → `service` → `repository` (Drizzle), schémas Zod dans `packages/validation`, tests à côté.

## Contexte tenant

1. Le guard d'auth résout l'utilisateur et sa `membership` (tenant + rôle).
2. Chaque requête ouvre une transaction et exécute `SELECT set_config('app.tenant_id', $1, true)`
   (portée limitée à la transaction ; ne jamais concaténer l'UUID dans la requête SQL).
3. Les politiques RLS filtrent sur `current_setting('app.tenant_id')`.
4. L'application se connecte avec un rôle PostgreSQL **sans** `BYPASSRLS`. Seules les migrations et le
   calcul nocturne des statistiques admin utilisent un rôle dédié, jamais exposé à une requête HTTP.

## Caisse hors ligne

- Catalogue, prix et clients mis en cache sur l'appareil (IndexedDB) au démarrage et après chaque synchro.
- Chaque vente reçoit un UUID généré sur l'appareil et entre dans une file locale.
- Au retour du réseau, `POST /sync/sales` envoie les ventes ; le serveur les rejoue de façon idempotente
  (même UUID = même vente, jamais de doublon).
- Un stock qui devient négatif après synchro n'est pas bloqué : il est signalé au gérant.
- La file locale survit à un redémarrage du téléphone.

## Hébergement

- Front (`web`, `admin`) : Vercel. API, worker, PostgreSQL, Redis : Railway, Render ou Fly.
- Région la plus proche de l'Afrique de l'Ouest disponible (Europe de l'Ouest aujourd'hui).
- Environnements : `local`, `staging` (déployé à chaque merge sur `main`), `production` (tag de version).
- Sauvegardes quotidiennes chiffrées, test de restauration mensuel (voir `docs/security.md`).

## Choix structurants

Voir `docs/decisions/` : monorepo TypeScript (0001), multi-tenant RLS (0002), agrégateur de paiement (0003),
caisse hors ligne (0004), montants en entiers FCFA (0005).
