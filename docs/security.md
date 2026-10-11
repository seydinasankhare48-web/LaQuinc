# Sécurité

Risque n°1 : qu'une quincaillerie voie les données d'une autre. Risque n°2 : qu'un employé manipule la caisse.
Les deux se traitent dans l'architecture, pas après coup.

## Isolation des données

- `tenant_id` + Row Level Security sur chaque table métier (voir `docs/architecture.md`, « Contexte tenant »).
- Le rôle PostgreSQL de l'application n'a pas `BYPASSRLS`.
- Chaque module a un test d'isolation : un utilisateur du tenant A tente de lire, modifier et supprimer
  une ressource du tenant B et reçoit une 404 (on ne révèle pas l'existence de la ressource).

## Authentification

- Connexion par téléphone + code OTP (SMS ou WhatsApp), via une solution éprouvée. Pas de crypto maison.
- OTP : 6 chiffres, expiration 5 minutes, 5 tentatives maximum, limitation de débit par numéro et par IP.
- Caisse sur appareil partagé : PIN court par vendeur (haché), session courte, verrouillage automatique.
- Back-office : compte séparé, double authentification obligatoire.

## Autorisations

| Action | owner | manager | cashier |
| --- | --- | --- | --- |
| Vendre, encaisser, rechercher | Oui | Oui | Oui |
| Remise au-delà du seuil du tenant | Oui | Oui | Non |
| Annuler une vente | Oui | Oui | Non |
| Modifier un prix, ajuster le stock | Oui | Oui | Non |
| Gérer les utilisateurs, paramètres, compte marchand | Oui | Non | Non |
| Voir marges et tableau de bord complet | Oui | Oui | Non |

Vérifié côté serveur sur chaque endpoint par un décorateur de rôle ; l'interface ne fait que masquer.

## Journal d'audit

Écrit dans `audit_logs` (ajout seul) : changement de prix, remise au-delà du seuil, annulation, ajustement
de stock, modification d'utilisateur ou de paramètres, émission de facture et d'avoir, toute action admin.
Le gérant consulte le journal de sa quincaillerie.

## Protection de l'API

- Validation Zod de tous les entrants ; réponses d'erreur sans détail interne.
- Limitation de débit : connexion, OTP, endpoints publics de la boutique, webhooks.
- En-têtes de sécurité (CSP, HSTS…), CORS restreint aux domaines LaQuinc.
- Webhooks : signature vérifiée, horodatage contrôlé, traitement idempotent.
- Uploads : types et tailles limités, fichiers servis depuis un domaine séparé.

## Secrets et dépendances

- Secrets en variables d'environnement uniquement ; `.env` dans `.gitignore` ; `.env.example` sans valeurs.
- Clés API des quincailleries chiffrées en base (chiffrement applicatif, clé maîtresse hors base).
- `pnpm audit` et mises à jour de dépendances automatiques (Dependabot ou Renovate) en CI.

## Sauvegardes et incidents

- Sauvegarde quotidienne chiffrée de PostgreSQL, conservée 30 jours ; test de restauration mensuel noté dans `docs/progress.md`.
- Journaux applicatifs sans données personnelles inutiles (pas de numéro complet ni de clé dans les logs).
- En cas de fuite suspectée : couper l'accès, faire tourner les secrets, prévenir les quincailleries concernées.

## Données personnelles

- Collecter le minimum : nom, téléphone, NINEA pour les pros. Jamais de numéro de carte (géré par l'agrégateur).
- Déclaration auprès de la CDP (Commission de protection des données personnelles du Sénégal), politique de
  confidentialité et CGU validées par un juriste avant l'ouverture au public.

## Rituels

- `/security-review` avant chaque merge (inclus dans `/pre-merge`).
- Agent `tenant-security-reviewer` sur tout nouveau module.
- Revue sécurité complète en semaine 12, avant l'arrivée des pilotes.
