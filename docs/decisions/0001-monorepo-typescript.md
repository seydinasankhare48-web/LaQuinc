# 0001 — Monorepo TypeScript

- Statut : acceptée
- Date : 2026-10-11

## Contexte
Un seul développeur, aidé de Claude Code, doit livrer front, API, worker et back-office en 12 semaines.
Les mêmes règles (validation, montants, rôles) doivent s'appliquer partout.

## Décision
Un monorepo pnpm + Turborepo, TypeScript strict de bout en bout : Next.js pour les interfaces, NestJS
pour l'API, schémas Zod partagés dans `packages/validation`.

## Conséquences
- Un seul langage, des types partagés : moins d'erreurs entre front et back.
- Claude Code voit tout le projet dans un seul dépôt.
- Le build doit rester rapide : cache Turborepo et tâches ciblées.

## Alternatives écartées
- Dépôts séparés : synchronisation des types et des versions trop coûteuse seul.
- Tout dans Next.js (route handlers) : moins de structure pour la logique métier, le worker et l'admin.
