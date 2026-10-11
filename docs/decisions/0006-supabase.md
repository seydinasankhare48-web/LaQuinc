# 0006 — Supabase comme infrastructure, la logique métier reste dans l'API

- Statut : acceptée
- Date : 2026-10-11

## Contexte
Un seul développeur doit livrer l'authentification par téléphone, la base, le stockage de fichiers et les
sauvegardes en 12 semaines. Les construire soi-même (OTP maison, Postgres auto-hébergé, stockage S3)
coûte du temps et des risques de sécurité. En revanche, les règles métier de LaQuinc (RLS par tenant,
stock et dettes par mouvements, factures immuables, caisse hors ligne rejouable) ne doivent pas
dépendre d'un fournisseur.

## Décision
Supabase sert d'**infrastructure** ; la logique métier reste dans `apps/api` (NestJS).

- PostgreSQL hébergé par Supabase (région Europe de l'Ouest).
- Supabase Auth : connexion par téléphone + OTP (fournisseur SMS branché via le *Send SMS hook*),
  MFA TOTP obligatoire pour le back-office (imposée par l'API : `aal2`).
- Supabase Storage : photos produits et factures PDF.
- Optionnel : `pg_cron` pour le calcul nocturne des statistiques admin.
- Conservés : NestJS, Drizzle (schéma et migrations), Redis + BullMQ, Next.js sur Vercel.
  La CLI Supabase ne sert qu'à l'environnement local ; les migrations restent celles de Drizzle.

Règles qui en découlent (reprises dans `CLAUDE.md`) :
1. Le front et la caisse n'accèdent jamais aux tables métier : tout passe par l'API.
   Le SDK Supabase côté client sert uniquement à la connexion.
2. L'API vérifie le JWT Supabase (JWKS, `iss`, `exp`, `aal`), ouvre une transaction et exécute
   `set_config('app.tenant_id', …, true)` avec un rôle PostgreSQL dédié sans `BYPASSRLS`.
3. Le tenant actif n'est jamais cru sur parole : s'il vient du client, l'API vérifie la membership.
4. Les tables métier ne sont pas exposées par l'API de données Supabase (PostgREST) : droits retirés
   à `anon` et `authenticated` dans chaque migration, schéma non exposé, et Data API désactivée si
   c'est compatible avec Auth et Storage (à tester sur le projet).
5. La clé `service_role` contourne la RLS : variable d'environnement du worker et des stats admin seulement.
6. Storage : buckets privés, URL signées générées par l'API ; seul le bucket des photos de la boutique est public.
7. `users.id = auth.users.id` ; `users` et `memberships` restent la source des rôles ; le PIN caisse reste chez nous, haché.
8. Sauvegardes Supabase + export `pg_dump` mensuel avec test de restauration + export des fichiers Storage.

## Conséquences
- Plus d'OTP maison ni d'hébergement de base : moins de code sensible à écrire et à maintenir.
- Coût : l'offre Pro est nécessaire pour les sauvegardes quotidiennes (7 jours de rétention) ; le PITR est en option.
- Les sauvegardes de la base **n'incluent pas** les fichiers Storage : ils ont leur propre export.
- Le projet dépend de Supabase pour la connexion ; la sortie reste possible car les données et le schéma sont du PostgreSQL standard.
- Supabase n'héberge pas l'API, le worker ni Redis : ils restent chez Railway, Render ou Fly.
- L'OTP par défaut de Supabase expire en 1 h et limite à 1 demande par 60 s : réduire l'expiration
  (visée : 5 min) et activer un CAPTCHA, à vérifier dans la configuration Auth.
- Il n'existe pas de réglage « MFA obligatoire » : l'API refuse tout JWT `aal1` sur le back-office.
- Les tests de base en CI utilisent un faux schéma `auth` (`auth.users` minimal) ; la CLI Supabase locale sert de contrôle de conformité.
- Un JWT expiré hors ligne ne bloque pas la vente en caisse (file locale) ; la synchronisation
  attend le renouvellement de la session.

## Alternatives écartées
- **Tout dans Supabase sans API** (SDK + RLS côté client, Edge Functions) : la logique critique
  (numérotation sans trou, synchronisation idempotente, webhooks de paiement) serait dispersée et
  difficile à tester ; le client aurait un accès direct aux tables.
- **PostgreSQL auto-hébergé** : sauvegardes, mises à jour et sécurité à la charge d'une seule personne.
