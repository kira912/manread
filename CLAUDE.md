# CLAUDE.md

Contexte et règles de travail pour Manread. Le `README.md` est la référence détaillée (cache, résilience, sécurité, déploiement) : le lire avant toute modification structurante plutôt que de deviner.

## Le produit

Manread est un index éditorial de manga, manhwa et manhua : découvrir, chercher, suivre des titres, puis les lire **là où ils sont légalement disponibles**.

- **Lecture in-app** uniquement pour les chapitres que Manread a le droit de distribuer (œuvres de créateurs, contenu sous licence, licences libres). Chaque chapitre porte sa licence et son ayant droit.
- **Plateformes officielles** pour tout le reste, via les liens officiels modérés d'AniList, validés côté serveur.

**Règle non négociable** : jamais de scraping, de miroir ou d'intégration de contenu tiers non autorisé. Toute fonctionnalité qui s'en approche est refusée, même « pour tester ».

## Stack

- Nuxt 4 (SSR, Nitro), Vue 3.5 `<script setup lang="ts">`, TypeScript strict, Zod 4
- nuxt-security (CSP à nonce + `strict-dynamic`), @nuxt/image (IPX en local, optimiseur Vercel en prod)
- Vitest (projets `unit` et `nuxt`), Playwright + axe-core
- Node 24, pnpm 10, déploiement Vercel (sans `vercel.json`) ou n'importe quel hôte Node
- Pas de framework CSS : tokens dans `app/assets/css/tokens.css`, primitives dans `app/components/ui/`

## Commandes

```bash
pnpm dev:offline   # dataset fictif, aucun réseau : à privilégier pour développer
pnpm dev           # catalogue AniList live
pnpm typecheck     # vue-tsc sur app, server et shared
pnpm test          # Vitest (unit + nuxt)
pnpm test:e2e      # build puis Playwright desktop + mobile, provider fixture
pnpm test:all      # tout, comme la CI
```

La CI (`.github/workflows/ci.yml`) exécute typecheck → test → build → Playwright. Une tâche n'est pas terminée tant que `pnpm typecheck` et `pnpm test` ne passent pas ; lancer `pnpm test:e2e` dès qu'on touche aux pages, aux routes, au SEO, aux en-têtes ou au lecteur.

## Architecture

```
shared/domain          TypeScript pur : modèles, invariants, parsing. Aucun framework, aucune I/O.
server/application     Cas d'usage + ports (CatalogProvider, AvailabilityProvider, ChapterSource, Cache, Logger, Metrics).
server/infrastructure  Adaptateurs : AniList, fixture, cache mémoire, résilience, observabilité, sécurité, contenu.
server/api, routes     Frontière HTTP fine : validation → cas d'usage → mapping d'erreurs + en-têtes de cache.
app/                   Présentation : pages, composants, composables, adaptateur de stockage navigateur.
```

- **Les dépendances pointent vers l'intérieur.** `shared/domain` n'importe rien de Nuxt, H3, Vue ni de `server/`. `server/application` ne dépend que des ports, jamais d'un adaptateur concret.
- **Composition root unique** : `server/utils/container.ts`. Un nouvel adaptateur s'enregistre là, nulle part ailleurs.
- **Nouvelle source de données = nouvel adaptateur d'un port existant**, avec un équivalent dans le provider `fixture` pour que l'offline et l'e2e continuent de fonctionner.
- **Handlers API** : toujours `defineApiHandler` + `requireResourceId` / `parseRequestBody` (`server/utils/api.ts`), cache via `HTTP_CACHE_SECONDS`. Un handler fait une ligne ou presque ; la logique va dans `server/application`.
- **Erreurs** : lever une sous-classe de `DomainError` (`shared/domain/errors.ts`). Le mapping HTTP, les messages publics génériques et le request ID sont gérés centralement. Ne jamais renvoyer un message interne ou une stack au client.
- **État client** : données catalogue via `useFetch` / `useAsyncData` (SSR) ; bibliothèque, historique, recherches via `usePersistedState` et les schémas versionnés de `app/infrastructure/storage` ; le reste reste local au composant. Pas de store global ajouté sans raison.

## Règles d'ingénierie (niveau senior fullstack)

### Avant de coder
- Lire le code voisin et réutiliser l'existant (utils, composables, primitives `Ui*`, builders de test) avant d'écrire quoi que ce soit de nouveau.
- Comprendre où la modification se situe dans les couches ; si elle force à violer la règle de dépendance, c'est le design qui est à revoir, pas la règle.
- Pour un changement non trivial ou ambigu, proposer brièvement l'approche et les compromis avant d'implémenter.

### Code
- Suivre le style existant : pas de point-virgule, guillemets simples, parenthèses omises sur un paramètre unique de lambda, `readonly` sur les interfaces de données, classes CSS en BEM (`control__chip`, `is-checked`). Il n'y a pas de linter : c'est à nous de rester cohérents.
- TypeScript strict sans échappatoire : pas de `any`, pas de `as` pour faire taire le compilateur, pas de `!` non justifié. Préférer les unions discriminées et le narrowing.
- Fonctions pures dans le domaine, effets aux bords. Pas d'abstraction spéculative : une interface n'existe que si elle a (ou aura immédiatement) deux implémentations, ou si c'est un port.
- Commentaires rares : expliquer le *pourquoi* d'une décision non évidente, jamais paraphraser le code.
- Pas de nouvelle dépendance sans justification claire (taille du bundle, maintenance, surface d'attaque). Préférer la plateforme et ce qui est déjà installé.
- Supprimer le code mort plutôt que le commenter ; pas de rétrocompatibilité inutile dans un projet sans consommateurs externes.

### Sécurité (par défaut, pas en option)
- Toute donnée externe (AniList, corps de requête, query string, `localStorage`, manifests) est non fiable : validation Zod à la frontière, éléments invalides écartés et comptés plutôt que de faire échouer toute la liste.
- URLs d'images et de liens : passer par `server/infrastructure/security/url-policy.ts`. HTML externe : réduit en texte côté serveur (`sanitize.ts`). Jamais de `v-html` sur du contenu externe.
- Aucun secret côté client : seules les clés `runtimeConfig.public` sont exposées, et elles ne contiennent rien de sensible.
- Ne pas affaiblir la CSP, les en-têtes ou la politique SSRF. Un nouveau domaine tiers (script, image, connect) s'ajoute explicitement dans `nuxt.config.ts`, conditionné à sa configuration, avec sa justification.
- Redirections uniquement vers des chemins internes canoniques. Liens sortants en `rel="noopener noreferrer external"`.
- Logs structurés via le `Logger` du container, jamais `console.log` côté serveur ; ne jamais logger de données personnelles ou de contenu de bibliothèque.

### Résilience et performance
- Tout appel amont passe par le client HTTP résilient et le `Cache` (SWR + coalescing) avec une `CachePolicy` de `server/application/cache-policies.ts`. Une source qui échoue dégrade la réponse (`availabilityDegraded`), elle ne casse jamais la page.
- Penser budget AniList : une page manga = une requête amont. Batcher plutôt que multiplier les appels.
- Front : pas de layout shift (dimensions connues des images), lazy-loading hors écran, préchargement uniquement là où l'intention est forte (hover, focus). Surveiller le poids du JS client.
- Serverless : cache, rate limiter et métriques sont en mémoire par instance. Ne rien construire qui suppose un état partagé entre instances.

### UI, accessibilité, langue
- Interface **en français** (`lang="fr"`, formats `fr-FR`). Les libellés de domaine traduits vivent dans `shared/domain/labels.ts`. Code, identifiants, commentaires, commits et README restent en anglais.
- Accessibilité WCAG 2.2 AA obligatoire : HTML sémantique d'abord, chaque contrôle labellisé, navigation clavier complète, focus visible, `prefers-reduced-motion` respecté. Les tests axe doivent rester verts.
- Design system : réutiliser les tokens et primitives `Ui*`. Un seul accent (`--c-shu`), utilisé avec parcimonie. Pas de valeurs de couleur ou d'espacement en dur.
- SEO : SSR pour toute page publique, `usePageSeo` pour titre/description/OG, URLs canoniques. Recherches filtrées en `noindex`.

### Tests
- Toute logique de domaine ou d'infrastructure ajoutée ou modifiée s'accompagne de tests Vitest. Un bug corrigé = un test qui le reproduisait.
- Utiliser `tests/support/builders.ts` et `fakes.ts` plutôt que des objets ad hoc ; fake `fetch` pour les providers, jamais le réseau réel.
- Tester le comportement observable, pas l'implémentation. Pas de snapshot géant.
- Les tests e2e tournent sur le provider `fixture` : enrichir `server/infrastructure/providers/fixture/dataset.ts` si un scénario l'exige.

### Analytics et vie privée
- Analytics sans cookie par défaut. Seule exception : Google Analytics 4, chargé uniquement après consentement explicite via la bannière (`useAnalyticsConsent`, `app/infrastructure/analytics/google-analytics.ts`) ; aucun autre outil à cookies ni appel à Google avant accord. Les événements sont typés dans `app/composables/useAnalytics.ts` ; un nouvel événement s'y déclare, ne contient ni identifiant, ni contenu de bibliothèque, ni historique, et ses valeurs texte sont tronquées.

### Git
- Commits atomiques, messages en anglais à l'impératif (« Add… », « Prioritize… »), un résumé court puis le détail en liste si utile.
- Ne commit et ne push que sur demande explicite.
- Mettre à jour le `README.md` quand un comportement documenté change (cache, sécurité, déploiement, variables d'env). Toute nouvelle variable d'environnement va aussi dans `.env.example`, commentée.

## Contenu in-app

Importer uniquement via `pnpm content:import` avec licence et ayant droit (voir README). Ne jamais ajouter manuellement de pages dans `public/content/` ni éditer un manifest à la main. Une source = une seule licence.
