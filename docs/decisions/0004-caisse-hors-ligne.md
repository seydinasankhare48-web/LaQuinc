# 0004 — Caisse PWA hors ligne avec synchronisation idempotente

- Statut : acceptée
- Date : 2026-10-11

## Contexte
La connexion des boutiques est instable. Une caisse qui bloque quand le réseau coupe sera abandonnée
au profit du cahier.

## Décision
La caisse est une PWA installable. Catalogue, prix et clients sont en cache (IndexedDB). Chaque vente
reçoit un UUID généré sur l'appareil et entre dans une file locale ; `POST /sync/sales` la rejoue sur
le serveur de façon idempotente. Un stock négatif après synchronisation est signalé, pas bloqué.

## Conséquences
- Ventes possibles sans réseau.
- La logique de vente doit rester rejouable, et les conflits (prix changé entre-temps) sont tranchés
  en faveur du prix enregistré au moment de la vente.
- Tests e2e en mode hors ligne obligatoires.

## Alternatives écartées
- Application native : plus longue à développer et à distribuer.
- Caisse 100 % en ligne : inutilisable en cas de coupure.
