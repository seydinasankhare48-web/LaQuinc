# 0005 — Montants en entiers FCFA

- Statut : acceptée
- Date : 2026-10-11

## Contexte
Les nombres à virgule flottante produisent des erreurs d'arrondi sur les totaux. Le franc CFA (XOF)
n'a pas de subdivision utilisée.

## Décision
Tous les montants sont des entiers FCFA (`bigint` en base, `number` entier côté TypeScript, validé par Zod),
suffixés `_xof` / `Xof`. Les quantités sont en `numeric(12,3)`. Le total d'une ligne est arrondi à
l'entier le plus proche, une seule fois, au niveau de la ligne.

## Conséquences
- Totaux exacts et cohérents entre caisse, factures et rapports.
- Si un pays à monnaie décimale arrive (phase 4), ajout d'une colonne de devise et d'une unité mineure par devise, via un nouvel ADR.

## Alternatives écartées
- `decimal` partout : inutile pour le XOF et plus lourd à manipuler côté client.
- `float` : erreurs d'arrondi.
