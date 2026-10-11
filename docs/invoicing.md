# Devis et factures

## Contexte réglementaire (à faire valider par un expert-comptable)

- La loi de finances 2025 (loi n°2025-02) rend la facturation électronique obligatoire pour les assujettis
  à la TVA au Sénégal. Le défaut est sanctionné par une amende de 25 % de la TVA concernée, plafonnée à
  5 millions FCFA par facture.
- Le calendrier d'application par seuil de chiffre d'affaires varie selon les sources : à confirmer avant le lancement.
- Taux normal de TVA : 18 %. Conservation des factures : 10 ans.

## Ce que le MVP doit garantir

- Mentions : nom et adresse du vendeur, NINEA, RCCM, numéro, date, client (NINEA s'il est professionnel),
  désignation, quantités, prix unitaires HT, TVA séparée, total TTC, mode de paiement.
- Numérotation séquentielle par tenant, **sans trou**, ex. `LQ-2026-000123`. Le numéro est attribué à
  l'émission (pas au brouillon), dans une transaction qui verrouille `invoice_sequences`.
- Facture émise = immuable. Correction ou annulation = avoir (`credit_note`) qui référence la facture.
- Une facture annulée reste visible avec son avoir.
- PDF généré par le worker, archivé dans Supabase Storage (bucket privé, URL signées), empreinte (hash) conservée en base pour l'intégrité.
- Tenant à l'impôt synthétique (non assujetti à la TVA) : facture sans TVA avec la mention adaptée (paramètre du tenant).

## Cycle

```
Devis (draft → sent → accepted) ──► Vente ──► Facture émise ──► Paiement(s)
                                                   └──► Avoir (si correction)
```

## Phase 2 : e-facture DGID

`packages/invoicing` expose un export structuré indépendant du PDF. La transmission passera par une
plateforme agréée via un adaptateur, sur le même principe que `PaymentProvider`.
