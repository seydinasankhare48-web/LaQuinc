# Sécurité

Risque n°1 : qu'une quincaillerie voie les données d'une autre. Risque n°2 : qu'un employé manipule la caisse.
Les deux se traitent dans l'architecture, pas après coup.

## Isolation des données

- `tenant_id` + Row Level Security sur chaque table métier (voir `docs/architecture.md`, « Contexte tenant »).
- Le rôle PostgreSQL de l'application (rôle dédié, ni `postgres` ni `service_role`) n'a pas `BYPASSRLS`.
- Le tenant actif vient de la membership de l'utilisateur authentifié. S'il est indiqué par le client,
  l'API vérifie la membership avant de l'appliquer.
- Défense en profondeur : la base refuse aussi les escalades de rôle (seul `owner` écrit sur `memberships` et
  `tenants`), les écritures du journal d'audit au nom d'un autre et le changement de téléphone.
- **Pas de SQL brut** avec une entrée utilisateur dans l'API : le contexte tenant est posé par `set_config`, qu'un
  SQL injecté pourrait modifier. Une règle ESLint de `apps/api` interdit `sql.raw` et `.unsafe`.
- **Exposition Supabase** : le front et la caisse n'accèdent jamais aux tables métier ; elles ne sont pas
  exposées par l'API de données (PostgREST). Chaque migration de table métier retire les droits à `anon`
  et `authenticated` (`REVOKE ALL … FROM anon, authenticated`) ; le schéma n'est pas dans « Exposed schemas » ;
  les privilèges par défaut sont retirés (`ALTER DEFAULT PRIVILEGES … REVOKE … FROM anon, authenticated, service_role`) ;
  le Data API est désactivée si c'est compatible avec Auth et Storage (à tester sur le projet).
- Chaque module a un test d'isolation : un utilisateur du tenant A tente de lire, modifier et supprimer
  une ressource du tenant B et reçoit une 404 (on ne révèle pas l'existence de la ressource).

## Authentification

- Connexion par téléphone + code OTP via **Supabase Auth**. Pas de crypto maison. Le fournisseur SMS est
  branché par le *Send SMS hook* (WhatsApp natif seulement via Twilio) ; choix à faire selon coût et
  délivrabilité vers Orange, Free et Expresso.
- OTP : 6 chiffres. Par défaut Supabase l'expire après 1 h et limite à 1 demande par 60 s : réduire
  l'expiration (visée : 5 min), activer un CAPTCHA et vérifier les limites de tentatives dans la
  configuration Auth. Limitation de débit complémentaire par numéro et par IP côté API.
- Vérification du JWT par l'API : signature via le JWKS du projet (clés asymétriques ; ne pas vérifier un
  JWT HS256 avec le secret partagé), puis `iss`, `exp`, `sub`, `aal`.
- Caisse sur appareil partagé : PIN court par vendeur (haché), session courte, verrouillage automatique.
- Back-office : compte séparé, **MFA TOTP Supabase obligatoire**. Supabase n'a pas de réglage « MFA
  obligatoire » : l'API du back-office refuse tout JWT dont `aal` n'est pas `aal2`. Un admin sans facteur
  inscrit reste `aal1` et doit d'abord s'inscrire.

## Autorisations

| Action | owner | manager | cashier |
| --- | --- | --- | --- |
| Vendre, encaisser, rechercher | Oui | Oui | Oui |
| Remise au-delà du seuil du tenant | Oui | Oui | Non |
| Annuler une vente | Oui | Oui | Non |
| Modifier un prix, ajuster le stock | Oui | Oui | Non |
| Gérer les utilisateurs, paramètres, compte marchand | Oui | Non | Non |
| Consulter la liste du personnel (noms, téléphones) | Oui | Oui | Non |
| Voir marges et tableau de bord complet | Oui | Oui | Non |

Vérifié côté serveur sur chaque endpoint par un décorateur de rôle ; l'interface ne fait que masquer.

## Journal d'audit

Écrit dans `audit_logs` (ajout seul) : changement de prix, remise au-delà du seuil, annulation, ajustement
de stock, modification d'utilisateur ou de paramètres, émission de facture et d'avoir, toute action admin.
Le gérant consulte le journal de sa quincaillerie.

## Protection de l'API

- Validation Zod de tous les entrants ; réponses d'erreur sans détail interne.
- Limitation de débit : connexion (Supabase Auth + API), OTP, endpoints publics de la boutique, webhooks.
  Par IP, avec `TRUST_PROXY` = nombre exact de proxys devant l'API (0 par défaut : ne jamais croire `X-Forwarded-For`
  sans proxy connu). `RATE_LIMIT_DISABLED` est refusé en production. Inscription : 5 par minute et par IP, et au
  plus 3 quincailleries par propriétaire (`TENANT_LIMIT`).
- Refus par défaut : une route de l'API doit déclarer `@Public`, `@Authenticated`, `@RequireTenant` ou `@Roles` ;
  un test parcourt toutes les routes et échoue si l'une l'oublie.
- Un JWT reste accepté jusqu'à son expiration même si l'utilisateur est banni (les memberships, elles, sont relues à
  chaque requête) ; les sessions anonymes Supabase sont refusées.
- Les erreurs inattendues sont journalisées sans message ni paramètres (les erreurs SQL de Drizzle contiennent les valeurs).
- En-têtes de sécurité (CSP, HSTS…), CORS restreint aux domaines LaQuinc.
- Webhooks : signature vérifiée, horodatage contrôlé, traitement idempotent.
- Uploads : types et tailles limités.
- Storage : buckets privés par défaut, accès par URL signées (`createSignedUrl`) générées par l'API ;
  seul le bucket des photos de la boutique publique est public.

## Secrets et dépendances

- Secrets en variables d'environnement uniquement ; `.env` dans `.gitignore` ; `.env.example` sans valeurs.
- La clé `service_role` contourne la RLS : uniquement dans les variables d'environnement du worker et du
  calcul des stats admin. Jamais dans `apps/web`, côté navigateur de `apps/admin`, ni dans la caisse.
  La clé publique (publishable) peut équiper le front, pour la connexion seulement.
- Clés API des quincailleries chiffrées en base (chiffrement applicatif, clé maîtresse hors base).
- `pnpm audit` et mises à jour de dépendances automatiques (Dependabot ou Renovate) en CI.

## Sauvegardes et incidents

- Sauvegardes quotidiennes Supabase (offre Pro minimale : 7 jours de rétention ; PITR en option).
- Export `pg_dump` mensuel conservé 30 jours, hors Supabase ; test de restauration mensuel noté dans `docs/progress.md`.
- Les sauvegardes de la base n'incluent pas les fichiers Storage : export séparé des photos et des PDF.
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
