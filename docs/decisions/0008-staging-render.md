# 0008 — Staging : API sur Render (offre gratuite), web sur Vercel, Supabase pour la base

- Statut : acceptée (staging seulement)
- Date : 2026-10-15

## Contexte
Il faut un staging déployé automatiquement depuis `main`, au coût le plus bas possible : le développeur travaille seul
et il n'y a pas encore de client. Aucun hébergeur n'offre un API toujours actif gratuitement.

## Décision
- API NestJS sur **Render** (offre gratuite, région Francfort), décrite dans `render.yaml`, déployée à chaque push sur `main`.
- Web sur **Vercel**.
- Base et Auth sur le projet **Supabase** de staging, atteint par le **pooler en mode session** : la connexion directe
  ne répond qu'en IPv6, ce qui exclut les machines de développement sans IPv6.
- **Redis reporté** : aucune brique actuelle n'en a besoin (la file BullMQ arrive avec le worker). Upstash gratuit
  pourra être ajouté à ce moment-là.

## Conséquences
- L'offre gratuite de Render met l'API en veille après environ 15 min sans appel : le premier appel suivant prend
  environ une minute. Acceptable pour tester ; **pas pour les quincailleries pilotes** → passer à une offre payante
  de Render (ou autre) et à Supabase Pro (sauvegardes, pas de mise en pause) avant l'installation chez les pilotes.
- Les migrations ne s'exécutent pas au déploiement : elles se lancent à la main (`pnpm db:migrate`) avec
  `DATABASE_ADMIN_URL` et `DATABASE_MIGRATOR_URL`, qui ne sont jamais donnés à Render. Render ne reçoit que `laquinc_app`.
- Mode transaction du pooler (port 6543) non testé : l'API reste en mode session (5432) tant que ce n'est pas vérifié.

## Alternatives écartées
- Railway : pas d'offre gratuite durable (crédit d'essai puis environ 5 $/mois).
- Fly.io : pas de vrai palier gratuit, plus de configuration.
- Connexion directe à Supabase : IPv6 seulement.
