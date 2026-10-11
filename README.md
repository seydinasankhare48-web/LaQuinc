# LaQuinc

Logiciel de gestion et de vente en ligne pour les quincailleries du Sénégal et d'Afrique francophone :
stock, caisse hors ligne, crédit client, devis et factures conformes, boutique en ligne avec paiement
Wave / Orange Money / Free Money.

## Démarrer

> Les commandes ci-dessous deviendront valides une fois le monorepo initialisé (semaines 1–2 du plan).

```bash
pnpm install
cp .env.example .env        # puis renseigner les valeurs (URL et clés Supabase locales : `supabase status`)
supabase start              # CLI Supabase : PostgreSQL, Auth, Storage en local (Docker requis)
docker compose up -d        # Redis en local
pnpm db:bootstrap          # crée les rôles laquinc_app et laquinc_migrator
pnpm db:migrate             # migrations Drizzle (la CLI Supabase ne gère pas les migrations)
pnpm dev                    # web, admin, api et worker
```

## Structure

```
laquinc/
├── CLAUDE.md          règles du projet pour Claude Code
├── .claude/           commandes, agents, skills, permissions
├── apps/
│   ├── web/           caisse, espace gérant, boutique (Next.js)
│   ├── admin/         back-office LaQuinc
│   ├── api/           NestJS
│   └── worker/        tâches de fond
├── packages/          db, validation, payments, invoicing, ui, i18n
├── docs/              plan, architecture, sécurité, décisions…
└── tests/e2e/         Playwright
```

## Documentation

Tout part de [`docs/plan.md`](docs/plan.md). L'état d'avancement est dans [`docs/progress.md`](docs/progress.md).

## Travailler avec Claude Code

Plugins recommandés : frontend-design, security-guidance, superpowers, code-review, context7, et un skill d'audit SEO.

| Commande | Usage |
| --- | --- |
| `/feature <description>` | Planifier puis implémenter une feature avec ses tests |
| `/pre-merge` | Vérifications avant de fusionner une branche |
| `/adr <titre>` | Enregistrer une décision d'architecture |
| `/fin-de-session` | Mettre à jour `docs/progress.md` |

Le skill `module-multi-tenant` sert de modèle pour tout nouveau module métier, et l'agent
`tenant-security-reviewer` vérifie l'isolation des données et les permissions.
