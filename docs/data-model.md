# Modèle de données

Trois règles : le stock et les dettes se calculent à partir de mouvements ; chaque ligne métier porte un
`tenant_id` ; une facture émise ne se modifie jamais.

## Conventions

- Tables et colonnes en `snake_case`, au pluriel : `stock_movements`, `sale_lines`.
- Clé primaire `id uuid` (UUID v7, générable sur l'appareil pour la caisse hors ligne).
- Colonnes communes : `tenant_id`, `created_at`, `updated_at`, `created_by`, `archived_at` (archivage logique).
- Montants : `bigint` en FCFA entiers, suffixe `_xof` (`unit_price_xof`). Jamais de float.
- Quantités : `numeric(12,3)`, suffixe `_qty`.
- Dates : `timestamptz` en UTC ; l'affichage se fait dans le fuseau du tenant (`Africa/Dakar` par défaut).
- Chaque table avec `tenant_id` : RLS activée + index sur `(tenant_id, …)`.
- Exposition Supabase : aucune table métier n'est accessible par l'API de données (PostgREST). Chaque
  migration qui crée une table fait `REVOKE ALL ON <table> FROM anon, authenticated` et n'ajoute aucun
  `GRANT` à ces rôles ; le schéma n'est pas dans « Exposed schemas ».

## Entités du MVP

| Table | Rôle | Règles |
| --- | --- | --- |
| `tenants` | Une quincaillerie abonnée | NINEA, RCCM, pays, devise `XOF`, fuseau, `slug` public (URL boutique) |
| `users` | Une personne | `id` = `auth.users.id` (Supabase Auth) ; téléphone (E.164). Les rôles ne viennent pas d'Auth mais de `memberships` |
| `memberships` | Rôle d'un user dans un tenant | `owner`, `manager`, `cashier` ; PIN caisse haché |
| `categories` | Catégories du catalogue | Arborescence simple (`parent_id`) |
| `products` | Articles | `base_unit` (piece, kg, m, sac…), `purchase_price_xof`, `sale_price_xof`, `sku`, `slug`, `low_stock_threshold_qty` |
| `stock_movements` | Entrée, vente, retour, ajustement, inventaire | `type`, `qty` signée, `reason`, `source_id` ; jamais modifié |
| `product_stock` | Stock courant en cache | Recalculable depuis `stock_movements` |
| `customers` | Client particulier ou pro | Téléphone, NINEA facultatif, `credit_limit_xof` |
| `customer_ledger_entries` | Écritures de crédit | `type` (sale_on_credit, repayment, adjustment), `amount_xof` signé |
| `sales` / `sale_lines` | Vente et lignes | Prix et remise figés ; `client_generated_id` pour la synchro hors ligne |
| `payments` | Encaissement | `method` (cash, wave, orange_money, free_money, credit, card), `reference`, `status` |
| `quotes` / `quote_lines` | Devis | Statuts : draft, sent, accepted, converted, expired |
| `invoices` / `invoice_lines` | Factures et avoirs | `number` séquentiel par tenant, `kind` (invoice, credit_note), immuable après émission |
| `invoice_sequences` | Compteur de numérotation | Une ligne par tenant et par année, verrouillée à l'émission |
| `online_orders` | Commandes de la boutique | Réserve le stock à la confirmation du paiement |
| `payment_provider_accounts` | Compte marchand du tenant | Clés API **chiffrées** |
| `audit_logs` | Journal des actions sensibles | Ajout seul, jamais modifié ni supprimé |

## Entités plateforme (back-office)

Hors RLS tenant, accessibles uniquement par `apps/admin` :

| Table | Rôle |
| --- | --- |
| `plans` | Formules et prix |
| `subscriptions` | Statut (trialing, active, past_due, suspended, canceled), dates d'essai et d'échéance |
| `subscription_payments` | Montant, moyen, référence, statut |
| `platform_admins` | Comptes admin LaQuinc (`user_id` = `auth.users.id`, MFA TOTP obligatoire : `aal2` exigé par l'API) |
| `daily_platform_stats` | Agrégats calculés chaque nuit par le worker |

## Migrations

- Générées avec Drizzle Kit, relues avant application, jamais modifiées après merge.
- Une migration qui crée une table métier crée aussi sa politique RLS, le retrait des droits à `anon` et
  `authenticated`, et son test d'isolation.
- Pas de migration destructive (suppression de colonne) sans étape intermédiaire et ADR.
