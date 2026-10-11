# LaQuinc — plan du produit

Source de vérité du périmètre et des priorités. Les détails techniques sont dans les autres fichiers de `docs/`.
Version de travail complète (avec schémas) : document « LaQuinc — Plan du SaaS » sur claude.ai.

## Vision

LaQuinc démarre comme un logiciel de gestion vendu par abonnement à chaque quincaillerie (stock, caisse,
crédit client, mini-boutique en ligne). La marketplace vient ensuite, alimentée par les catalogues et les
stocks réels déjà saisis dans le logiciel.

**Le problème.** Une quincaillerie gère des milliers de références vendues à l'unité, au kilo, au mètre ou
au sac. Le stock est tenu sur cahier ou Excel, les crédits clients sur une ardoise, et l'argent arrive en
espèces, Wave et Orange Money sans vue d'ensemble.

**La promesse.** Savoir à tout moment ce qu'on a en stock, ce qu'on a vendu et qui nous doit de l'argent,
depuis son téléphone, même quand la connexion coupe.

**Pourquoi deux étapes.** Une marketplace sans stock fiable reçoit des commandes impossibles à honorer.
Le logiciel crée la donnée qui rend la marketplace crédible, et rapporte un revenu récurrent dès le début.

## Utilisateurs

| Profil | Ce qu'il veut faire | Contraintes terrain |
| --- | --- | --- |
| Gérant / propriétaire | Voir stock, ventes, marges et dettes ; gérer employés et prix ; alertes de rupture | Android, peu de temps, méfiance envers les employés |
| Vendeur en caisse | Encaisser vite, chercher un article, envoyer un reçu | Connexion instable, appareil partagé |
| Client particulier | Vérifier la disponibilité, commander, payer par Wave ou à la livraison | Mobile, data chère, préfère WhatsApp |
| Artisan / entreprise BTP | Devis, commandes en gros, crédit, factures | Factures conformes (NINEA), prix négociés |

Règles produit : mobile d'abord ; caisse hors ligne ; français simple avec i18n prête pour le wolof ;
reçus, devis et relances par WhatsApp et SMS.

## Périmètre du MVP (12 semaines)

Critère de réussite : 3 à 5 quincailleries pilotes utilisent la caisse chaque jour.

| Module | Dans le MVP | Reporté |
| --- | --- | --- |
| Comptes et rôles | Inscription d'une quincaillerie, rôles Gérant et Vendeur | Rôles personnalisés, plusieurs magasins |
| Catalogue | Articles, catégories, unités (pièce, kg, m, sac), prix d'achat et de vente, import Excel/CSV | Variantes complexes, codes-barres imprimés |
| Stock | Entrées, sorties, ajustements, inventaire, alerte stock bas | Transferts, lots, prévisions |
| Caisse | Vente rapide, recherche, remise, reçu PDF/WhatsApp, **hors ligne** | Imprimante thermique, tiroir-caisse |
| Paiements en caisse | Espèces, Wave, OM, Free Money enregistrés avec référence | QR automatique en caisse |
| Crédit client | Ardoise, plafond, remboursements partiels, relance WhatsApp | Échéanciers |
| Devis et factures | Devis → vente, facture numérotée avec NINEA et TVA, avoirs | Transmission e-facture DGID |
| Boutique en ligne | Vitrine SEO par quincaillerie, panier, paiement agrégateur ou à la livraison | Livraison suivie, avis |
| Tableau de bord gérant | Ventes jour/mois, marge, dettes, ruptures | Rapports exportables |
| Back-office LaQuinc | Quincailleries, abonnements, paiements, MRR | Voir `docs/admin.md` (phase 2) |
| Fournisseurs | — | Bons de commande, dettes fournisseurs |
| Marketplace | — | Phase 3 |

Hors MVP volontairement : application native (PWA suffit), comptabilité complète, multi-pays.
**Toute nouvelle idée va dans la colonne « Reporté », pas dans le sprint en cours.**

## Feuille de route

| Phase | Période | Contenu | Critère de sortie |
| --- | --- | --- | --- |
| 1 · MVP gestion | Mois 1–3 | Stock, caisse, crédit, devis/factures, boutique, 3–5 pilotes | Pilotes actifs chaque jour |
| 2 · Croissance | Mois 4–6 | Fournisseurs, plusieurs magasins, imprimante, e-facture DGID, wolof, admin complet | Clients payants qui restent |
| 3 · Marketplace | Mois 7–12 | Catalogue commun, recherche par ville, livraison, commission, avis | Stock fiable dans une ville |
| 4 · Expansion | Année 2 | Côte d'Ivoire, Mali, MTN et Moov Money, autres langues, grossistes | Rentable pays par pays |

## Planning sur 12 semaines

1. **Semaines 1–2 · Fondations** — monorepo, CI, projet Supabase (auth téléphone + OTP via Supabase Auth, CLI locale),
   vérification du JWT dans l'API, tenants, rôles, RLS + tests d'isolation, staging (voir `docs/plan-fondations.md`).
2. **Semaines 3–4 · Catalogue et stock** — articles, catégories, unités, import CSV, mouvements, inventaire, alertes.
3. **Semaines 5–6 · Caisse** — vente rapide, paiements multiples, reçus, hors ligne + synchronisation.
4. **Semaine 7 · Clients et crédit** — fiches, ardoise, plafond, remboursements, relances.
5. **Semaine 8 · Devis et factures** — devis → vente, factures conformes, avoirs.
6. **Semaines 9–10 · Boutique en ligne** — vitrine SEO, panier, agrégateur, paiement à la livraison, commandes.
7. **Semaine 11 · Pilotage** — tableau de bord gérant, audit log, abonnement LaQuinc, back-office minimal.
8. **Semaine 12 · Durcissement** — revue sécurité, audit SEO, e2e, sauvegardes, installation chez les pilotes.

En parallèle dès la semaine 1 : trouver 3 à 5 pilotes et leurs catalogues ; NINEA, RCCM et comptes
marchands ; expert-comptable (facturation) et juriste (CGU, CDP) ; réserver `laquinc.sn` / `laquinc.com`
et déposer la marque à l'OAPI ; créer le projet Supabase et choisir le fournisseur SMS (coût et délivrabilité
vers Orange, Free, Expresso).

## Modèle économique (hypothèses à tester)

| Formule | Prix indicatif | Contenu |
| --- | --- | --- |
| Démarrage | 5 000 FCFA / mois | 1 utilisateur, stock, caisse, crédit |
| Pro | 15 000 FCFA / mois | 5 utilisateurs, devis/factures, boutique en ligne |
| Entreprise | 30 000 FCFA / mois | Illimité, plusieurs magasins, support prioritaire |

Essai gratuit 30 jours, paiement par Wave, 2 mois offerts en annuel. Commission marketplace en phase 3.

## Risques principaux

| Risque | Parade |
| --- | --- |
| Caisse plus lente que le cahier | Vente en 3 touches maximum, test chronométré avec les pilotes |
| Saisie de milliers d'articles | Import Excel, catalogue de base pré-rempli |
| Connexion instable | Caisse hors ligne dès le MVP |
| Périmètre trop large | Tableau MVP figé |
| Règles DGID qui évoluent | Expert-comptable, module e-facture séparé |
| Fraude interne | Permissions strictes + journal d'audit visible par le gérant |

## Questions ouvertes

- [ ] Régime fiscal des pilotes (réel / TVA ou impôt synthétique) ?
- [ ] Quel agrégateur de paiement après comparaison des contrats ?
- [ ] Imprimante de reçus nécessaire dès le MVP ?
- [ ] Quel pays après le Sénégal, et quand ?
