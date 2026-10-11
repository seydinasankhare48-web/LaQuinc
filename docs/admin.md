# Back-office LaQuinc

Application séparée (`apps/admin`, `admin.laquinc.sn`) réservée à l'équipe LaQuinc pour suivre
abonnés, revenus et paiements. MVP minimal en semaine 11, version complète en phase 2.

## Indicateurs

| Indicateur | Définition | MVP |
| --- | --- | --- |
| Quincailleries par statut | trialing, active, past_due, suspended, canceled | Oui |
| MRR | Somme des abonnements `active` ramenés au mois, en FCFA, par formule | Oui |
| Paiements d'abonnement | Réussis, échoués, en attente ; moyen et référence | Oui |
| Nouveaux abonnés / résiliations | Sur le mois en cours et les 6 précédents | Oui |
| Conversion essai → payant | Essais terminés devenus `active` / essais terminés | Phase 2 |
| Activité par boutique | Ventes par jour ; alerte si aucune vente depuis 7 jours | Phase 2 |
| Volume boutiques en ligne | Total des commandes en ligne payées | Phase 2 |
| Répartition géographique | Abonnés par ville et pays | Phase 2 |

Les indicateurs sont calculés chaque nuit par le worker dans `daily_platform_stats` ;
les écrans de l'admin lisent ces agrégats, pas les tables des tenants.

## Écrans

1. **Accueil** : cartes MRR, abonnés actifs, essais en cours, paiements échoués ; courbe sur 6 mois.
2. **Quincailleries** : liste filtrable (statut, formule, ville), recherche par nom ou téléphone.
3. **Fiche quincaillerie** : formule, échéance, historique des paiements, utilisateurs, dernière activité.
4. **Paiements** : liste de tous les paiements d'abonnement, filtres, export CSV.
5. **Journal** : actions effectuées par les admins.

## Actions

- Changer de formule, prolonger un essai, offrir un mois, suspendre, réactiver.
- Enregistrer un paiement manuel (espèces, virement) avec justificatif.
- Exporter abonnés et paiements en CSV.
- Accès support à un compte client : demandé au gérant, accepté par lui, limité à 1 heure, journalisé,
  bandeau visible pendant la session.

## Sécurité

- Comptes `platform_admins` distincts, double authentification obligatoire, sessions courtes.
- Chaque action écrite dans `audit_logs`.
- Par défaut : chiffres agrégés et état des abonnements, jamais le détail des ventes ni les fichiers
  clients des quincailleries.
- `noindex`, et accès restreint par IP envisageable.
