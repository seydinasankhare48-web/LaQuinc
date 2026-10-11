# 0003 — Agrégateur de paiement derrière une interface

- Statut : acceptée (choix de l'agrégateur en attente)
- Date : 2026-10-11

## Contexte
Les clients paient par Wave, Orange Money, Free Money et parfois carte. Intégrer chaque opérateur
séparément multiplie les contrats, les webhooks et la maintenance.

## Décision
Pour le MVP, un agrégateur unique pour la boutique en ligne, utilisé via l'interface `PaymentProvider`
(`packages/payments`). L'argent va sur le compte marchand de chaque quincaillerie, pas sur celui de LaQuinc.
En caisse, les paiements mobiles sont seulement enregistrés avec leur référence.

## Conséquences
- Une intégration au lieu de quatre.
- Commission un peu plus élevée qu'une intégration directe.
- Changer d'agrégateur ou ajouter Wave en direct = un nouvel adaptateur, sans toucher au reste.

## Alternatives écartées
- Wave + Orange Money en direct dès le MVP : trop de travail pour 12 semaines.
- Encaisser pour le compte des boutiques : statut d'intermédiaire financier, hors de portée.
