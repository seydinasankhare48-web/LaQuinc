# Conventions

## Langue

- Code, noms de variables, tables, commits : **anglais**.
- Documentation (`docs/`), textes de l'interface (via `packages/i18n`) : **français**.

## Nommage

| Élément | Convention | Exemple |
| --- | --- | --- |
| Fichiers TS | kebab-case | `stock-movement.service.ts` |
| Composants React | PascalCase | `ProductSearch.tsx` |
| Variables, fonctions | camelCase | `computeStockQty` |
| Tables, colonnes SQL | snake_case pluriel | `customer_ledger_entries` |
| Montants | suffixe `Xof` / `_xof`, entier | `totalXof` |
| Quantités | suffixe `Qty` / `_qty` | `onHandQty` |
| Routes API | REST, pluriel, kebab-case | `GET /products`, `POST /sync/sales` |

## Structure d'un module API

```
apps/api/src/modules/<domaine>/
├── <domaine>.module.ts
├── <domaine>.controller.ts      routes, rôles, validation Zod
├── <domaine>.service.ts         règles métier
├── <domaine>.repository.ts      accès Drizzle, toujours dans le contexte tenant
└── __tests__/
    ├── <domaine>.service.spec.ts
    └── <domaine>.isolation.spec.ts
```

## Git

- `main` toujours déployable (déployée en staging automatiquement).
- Une feature = une branche `feat/<sujet>`, `fix/<sujet>`, `chore/<sujet>`.
- Commits au format Conventional Commits : `feat(stock): add inventory count`.
- Pas de merge sans `/pre-merge` vert.
- Version de production taguée `vYYYY.MM.N`.

## Erreurs

- Erreurs métier typées (`InsufficientCreditError`, `InvoiceAlreadyIssuedError`) traduites en codes HTTP par un filtre unique.
- Messages d'erreur destinés à l'utilisateur dans `packages/i18n`, jamais de texte technique affiché.

## Formats

- Téléphone : stocké en E.164 (`+221771234567`), affiché `77 123 45 67`.
- Montants : affichés `15 000 FCFA` (espace insécable comme séparateur de milliers).
- Dates : affichées `11/10/2026`, fuseau du tenant.

## Interface

- Composants de `packages/ui` d'abord ; un nouveau composant générique y va, pas dans une app.
- Cibles tactiles d'au moins 44 px ; la caisse doit être utilisable d'une main.
- Chaque écran gère quatre états : chargement, vide, erreur, hors ligne.
