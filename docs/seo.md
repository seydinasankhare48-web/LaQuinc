# SEO

Objectif : apparaître quand quelqu'un cherche « ciment 50 kg Pikine » ou « quincaillerie près de moi ».
Le SEO concerne uniquement les pages publiques (vitrines, fiches produits, guides, puis marketplace).

## Indexation

| Zone | Indexée | Rendu |
| --- | --- | --- |
| Boutique publique `laquinc.sn/<slug-boutique>/…` | Oui | Rendu serveur (SSR/ISR) |
| Guides `laquinc.sn/guides/…` | Oui | Statique |
| Caisse, espace gérant | Non (`noindex`, derrière connexion) | Client |
| Back-office `admin.laquinc.sn` | Non (`noindex` + bloqué dans `robots.txt`) | Client |

## URL

- Un seul domaine : `laquinc.sn/quincaillerie-ndiaye/ciment-cem-ii-50-kg`.
- Slugs en minuscules, sans accents, tirets. Un slug qui change → redirection 301 de l'ancien.
- Domaines personnalisés plus tard (option payante), avec canonical vers l'URL choisie.

## Chaque page publique

- `<title>` unique : article + quartier/ville + boutique (≤ 60 caractères si possible).
- Meta description unique (≤ 155 caractères), Open Graph et image de partage (WhatsApp affiche l'aperçu).
- Un seul `<h1>`, fil d'Ariane, liens internes vers la catégorie et les articles proches.
- Balise canonical.
- Images : WebP, dimensions fixées, `alt` descriptif, chargement différé hors écran.

## Données structurées (JSON-LD)

- Page boutique : `HardwareStore` (nom, adresse, téléphone, horaires, géolocalisation).
- Fiche produit : `Product` + `Offer` (`priceCurrency: "XOF"`, prix, `availability` calculée depuis le stock réel).
- `BreadcrumbList` partout. Validées dans les tests e2e.

## Fichiers techniques

- `sitemap.xml` index + un sitemap par boutique, régénérés quand le catalogue change.
- `robots.txt` : autorise la boutique, bloque `/pos`, `/dashboard`, l'API et l'admin.

## Le piège : contenu dupliqué

Le catalogue de base pré-rempli produira des fiches identiques d'une boutique à l'autre.
- Chaque fiche affiche ce qui est propre à la boutique : prix, stock, quartier, photos, conditions.
- Encourager le gérant à ajouter ses propres photos et descriptions.
- Phase 3 : une page produit commune sur la marketplace devient la référence (canonical) et liste les
  boutiques qui ont l'article en stock.

## Performance

Budget mobile : LCP < 2,5 s, CLS < 0,1, INP < 200 ms sur un Android d'entrée de gamme en 3G/4G.
JavaScript minimal sur les pages publiques. Mesuré en CI (Lighthouse) sur 3 pages types.

## SEO local et contenu

- Onboarding : aider chaque quincaillerie à créer ou réclamer sa fiche Google Business Profile,
  avec un lien vers sa vitrine. Mêmes nom, adresse, téléphone partout.
- Phase 3 : pages par ville et quartier.
- Guides pratiques écrits avec les mots des clients (« fer de 10 », « tôle ondulée »).
- `hreflang` quand le wolof et d'autres pays arriveront.

## Mesure

Google Search Console dès la mise en ligne, analytics respectueux de la vie privée, audit SEO
(skill `seo-audit`) avant chaque mise en production importante.
