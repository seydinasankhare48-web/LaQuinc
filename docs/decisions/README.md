# Décisions d'architecture (ADR)

Chaque choix structurant est noté ici, pour se rappeler pourquoi dans six mois.
Un ADR accepté ne se modifie pas : s'il est remplacé, on en écrit un nouveau qui le « remplace ».

| N° | Décision | Statut |
| --- | --- | --- |
| [0001](0001-monorepo-typescript.md) | Monorepo TypeScript (pnpm + Turborepo) | Acceptée |
| [0002](0002-multi-tenant-rls.md) | Une base partagée, isolation par RLS | Acceptée |
| [0003](0003-agregateur-paiement.md) | Agrégateur de paiement derrière une interface | Acceptée |
| [0004](0004-caisse-hors-ligne.md) | Caisse PWA hors ligne avec synchronisation idempotente | Acceptée |
| [0005](0005-montants-entiers-xof.md) | Montants en entiers FCFA | Acceptée |
| [0006](0006-supabase.md) | Supabase comme infrastructure, logique métier dans l'API | Acceptée |
| [0007](0007-google-en-complement.md) | Google en complément du téléphone, numéro vérifié obligatoire | Acceptée |
| [0008](0008-staging-render.md) | Staging : API sur Render gratuit, web sur Vercel, Supabase | Acceptée |

## Modèle

```markdown
# NNNN — Titre

- Statut : proposée | acceptée | remplacée par NNNN
- Date : AAAA-MM-JJ

## Contexte
Le problème et les contraintes.

## Décision
Ce qu'on fait.

## Conséquences
Ce que ça implique, en bien et en moins bien.

## Alternatives écartées
Et pourquoi.
```
