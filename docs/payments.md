# Paiements

L'argent des ventes va directement sur le compte marchand de chaque quincaillerie, jamais sur celui de
LaQuinc : sinon LaQuinc devient un intermédiaire financier. Chaque tenant branche son propre compte
dans ses paramètres (`payment_provider_accounts`, clés chiffrées).

## En caisse (MVP)

Le vendeur choisit le moyen (espèces, Wave, Orange Money, Free Money, crédit) et saisit la référence de
transaction. Aucun appel d'API : fonctionne hors ligne. Une vente peut avoir plusieurs paiements
(ex. moitié espèces, moitié Wave). Rapprochement de fin de journée par moyen de paiement.

## Boutique en ligne (MVP)

- Un agrégateur (PayDunya, PayTech, CinetPay… choix à faire après comparaison des contrats) regroupe
  Wave, Orange Money, Free Money et la carte derrière une API et un webhook.
- Paiement à la livraison toujours proposé.
- L'intégration directe Wave Business (commission plus basse) viendra plus tard pour les gros volumes ;
  elle exige un compte marchand avec NINEA et RCCM.

## Interface `PaymentProvider` (`packages/payments`)

```ts
interface PaymentProvider {
  createCheckout(input: {
    orderId: string;
    amountXof: number;          // entier
    customerPhone?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ checkoutUrl: string; providerRef: string }>;

  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<PaymentEvent>;

  getStatus(providerRef: string): Promise<PaymentStatus>;
}
```

Ajouter ou changer d'agrégateur = écrire un nouvel adaptateur, sans toucher aux modules métier.

## Règles des webhooks

1. Lire le corps brut et vérifier la signature avant tout traitement ; rejeter sinon.
2. Contrôler l'horodatage pour refuser les rejeux anciens.
3. Idempotence : table des événements traités, clé unique `(provider, event_id)`. Un même événement
   reçu plusieurs fois ne crée qu'un paiement.
4. Une commande passe à « payée » **uniquement** ici, jamais sur la page de retour du client.
5. Le montant reçu doit être égal au montant attendu ; sinon, statut à vérifier et alerte au gérant.
6. Répondre vite (200) et déléguer le travail lourd au worker.

## Abonnements LaQuinc

- Ton propre abonnement s'encaisse aussi par agrégateur, Wave en priorité.
- Cycle : essai 30 jours → `active` → à échéance, lien de paiement envoyé par WhatsApp/SMS →
  relances à J-3, J0, J+3 → `past_due` → `suspended` à J+15 (lecture seule, aucune donnée supprimée).
- Paiement manuel (espèces, virement) enregistrable depuis le back-office.

## À vérifier avant intégration

Commissions, délais de versement et documents exigés varient selon les prestataires et changent :
les confirmer directement auprès de chacun avant de signer.
