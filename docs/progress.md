# Journal d'avancement

Mis à jour à la fin de chaque session de travail (commande `/fin-de-session`).
Claude Code le lit en début de session. Les entrées les plus récentes sont en haut.

## État actuel

- **Phase** : 1 · MVP gestion
- **Bloc en cours** : Semaines 1–2 · Fondations (étapes 1–2 faites — voir `docs/plan-fondations.md`)
- **Prochaine étape** : étape 3 du plan des Fondations (base et RLS, tests d'isolation d'abord)
- **Bloquants** : aucun

## Checklist du MVP

- [ ] Semaines 1–2 · Fondations (monorepo, CI, auth OTP, tenants, rôles, RLS + tests d'isolation, staging)
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
