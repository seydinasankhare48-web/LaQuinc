---
description: Enregistrer une décision d'architecture dans docs/decisions
argument-hint: <titre de la décision>
---

Crée un ADR pour la décision : $ARGUMENTS

1. Trouve le prochain numéro libre dans `docs/decisions/` (format `NNNN`).
2. Crée `docs/decisions/NNNN-<titre-en-kebab-case>.md` à partir du modèle de `docs/decisions/README.md`,
   avec la date du jour et le statut « proposée ».
3. Remplis Contexte, Décision, Conséquences et Alternatives écartées à partir de notre conversation.
   S'il manque une information, pose-moi la question au lieu d'inventer.
4. Ajoute la ligne correspondante dans le tableau de `docs/decisions/README.md`.
5. Si la décision remplace un ADR existant, mets le statut de l'ancien à « remplacée par NNNN ».
