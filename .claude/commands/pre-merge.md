---
description: Vérifications obligatoires avant de fusionner une branche dans main
---

Vérifie la branche courante avant merge. Arrête-toi et signale au premier blocage.

1. **Qualité** : lance `pnpm lint`, `pnpm typecheck`, `pnpm test`, puis les tests e2e concernés.
2. **Diff** : relis `git diff main...HEAD` et vérifie les règles de `CLAUDE.md`, en particulier :
   - toute nouvelle table métier a `tenant_id`, une politique RLS et un test d'isolation ;
   - montants en entiers FCFA, aucun float ;
   - aucune modification ou suppression de facture émise, de mouvement de stock ou d'écriture de crédit ;
   - chaque endpoint a un contrôle de rôle et une validation Zod ;
   - actions sensibles écrites dans `audit_logs` ;
   - aucun secret, aucune clé, aucun `.env` dans le diff ;
   - Supabase : migrations de tables métier avec `REVOKE ALL … FROM anon, authenticated` et sans schéma exposé ;
     `service_role` absente de `apps/web`, du navigateur d'`apps/admin` et de la caisse ; pas d'accès direct
     aux tables depuis le front (le SDK sert à la connexion) ; JWT vérifié (JWKS, `iss`, `exp`, `aal2` pour
     l'admin) ; buckets privés avec URL signées ;
   - pas de texte d'interface en dur hors `packages/i18n` ;
   - pages publiques : métadonnées, canonical, données structurées ; pages privées en `noindex`.
3. **Isolation** : si le diff touche la base, l'API ou les permissions, lance l'agent `tenant-security-reviewer`.
4. **Revues** : lance la revue de code et la revue de sécurité (`/code-review` et `/security-review`) si
   elles sont disponibles ; sinon, demande-moi de les lancer.
5. **Documentation** : si une règle, une table ou un choix d'architecture a changé, mets à jour le fichier
   de `docs/` concerné ou propose un ADR.

Termine par un verdict clair : **prêt à merger**, ou la liste des points à corriger, classés par gravité.
