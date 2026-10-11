# 0002 — Une base partagée, isolation par Row Level Security

- Statut : acceptée
- Date : 2026-10-11

## Contexte
Des centaines puis des milliers de quincailleries, chacune avec des données confidentielles
(ventes, marges, clients). Une fuite entre boutiques serait fatale pour la confiance.

## Décision
Une seule base PostgreSQL. Chaque table métier porte `tenant_id` et une politique RLS basée sur
`current_setting('app.tenant_id')`, fixé par transaction. L'application se connecte avec un rôle sans
`BYPASSRLS`. Chaque module a un test d'isolation.

## Conséquences
- Un oubli de filtre dans le code ne suffit plus à faire fuiter des données : la base refuse.
- Une seule base à migrer, sauvegarder et surveiller.
- Les statistiques transverses (back-office) passent par un rôle dédié et des tables d'agrégats.

## Alternatives écartées
- Une base par tenant : coûteuse et lourde à migrer pour un développeur seul.
- Filtre `tenant_id` uniquement dans le code : un seul oubli = une fuite.
