---
description: Planifier puis implémenter une feature LaQuinc avec ses tests
argument-hint: <description de la feature>
---

Feature demandée : $ARGUMENTS

Suis ces étapes dans l'ordre, sans en sauter :

1. **Cadrer.** Lis `docs/progress.md`, `docs/plan.md` et le ou les documents de `docs/` concernés
   (voir l'index dans `CLAUDE.md`). Vérifie que la feature est dans le périmètre MVP ; sinon, dis-le et arrête-toi.
2. **Planifier.** Propose un plan court :
   - fichiers créés ou modifiés ;
   - tables et migrations (avec politique RLS) ;
   - endpoints, rôles autorisés, schémas Zod ;
   - écrans et états (chargement, vide, erreur, hors ligne) ;
   - tests prévus, dont le test d'isolation tenant.
   **Attends ma validation avant de coder.**
3. **Tester d'abord.** Écris les tests des règles métier et le test d'isolation, vérifie qu'ils échouent.
4. **Implémenter.** Pour un nouveau module, suis le skill `module-multi-tenant`. Pour une interface,
   utilise le skill frontend-design et `packages/ui`. Textes via `packages/i18n`.
5. **Vérifier.** `pnpm lint`, `pnpm typecheck`, `pnpm test` ; e2e Playwright du parcours principal.
6. **Conclure.** Résume ce qui a été fait, ce qui reste, et propose de lancer `/pre-merge`.
