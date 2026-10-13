# 0007 — Connexion Google en complément du téléphone, numéro vérifié obligatoire

- Statut : acceptée
- Date : 2026-10-13

## Contexte
Les gérants demandent de se connecter avec Google. Or `users.phone` est obligatoire et unique : les relances
de crédit, le reçu WhatsApp/SMS et l'identification d'un vendeur reposent sur le numéro. Un compte Google n'en a pas.
La connexion Google sort du périmètre MVP de `docs/plan.md` ; elle est acceptée comme confort de connexion, sans
changer le modèle de données.

## Décision
- Google **s'ajoute** à la connexion par téléphone + OTP ; il ne la remplace pas.
- Un compte connecté par Google sans numéro passe par un écran « Vérifiez votre numéro » : `updateUser({ phone })`
  puis `verifyOtp({ type: 'phone_change' })`, puis renouvellement de la session pour que le JWT porte le numéro.
  Tant que le numéro n'est pas vérifié, la quincaillerie ne peut pas être créée : l'API refuse `POST /tenants`
  (`PHONE_REQUIRED`) et le web envoie vers `/telephone`. Aucune migration, aucun changement d'API.
- Flux PKCE : `signInWithOAuth` puis `exchangeCodeForSession` sur `/auth/callback` (`detectSessionInUrl` désactivé :
  l'échange est explicite, une seule fois).
- Liaison manuelle activée (`enable_manual_linking`) : bouton « Associer mon compte Google » sur l'accueil
  (`linkIdentity`) pour relier un compte téléphone existant. Sans liaison, un même humain peut avoir deux comptes.
- Un numéro déjà utilisé par un autre compte est refusé (`phone_exists`) avec un message qui invite à se connecter
  avec ce numéro.

## Conséquences
- Le SDK Supabase reste limité à la connexion (règle S1).
- Hors dépôt : client OAuth Google (type « Web »), fournisseur et liaison manuelle à activer dans le tableau de bord
  Supabase, URL de rappel autorisées. Le secret Google n'entre jamais dans le dépôt.
- Les e2e utilisent un faux Google dans le faux Supabase ; l'écran de consentement réel ne se teste qu'à la main au staging.
- À vérifier au staging : le numéro est bien envoyé au `phone_change` et le claim `phone` apparaît après `refreshSession`.
- Risque connu : deux comptes pour une même personne (email Google, téléphone) si elle ne lie pas ses identités.
