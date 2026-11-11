# CLAUDE.md — front-end web

Conventions du front-end **gestion-temps** (Next.js, App Router, TypeScript `strict`, Tailwind CSS 4,
shadcn/ui). Elles complètent la partie « Commun » du `CLAUDE.md` racine (Git Flow, commits, versions,
qualité) ; la partie « Backend (API Java) » ne s'applique pas ici.

@AGENTS.md

## Commandes

À lancer depuis `web/` :

```bash
npm run dev            # serveur de dev sur http://localhost:3000 (Keycloak et API lancés, .env.local rempli)
npm run lint           # ESLint (config Next)
npm run format         # Prettier (format:check pour vérifier seulement)
npm run typecheck      # tsc --noEmit
npm test               # Vitest (test:watch en continu)
npm run build          # build de production
npm run api:types      # régénère src/lib/api/schema.d.ts depuis /v3/api-docs de l'API de dev
```

Après toute modification : `lint`, `format:check`, `typecheck` et `test` passent avant de déclarer
une tâche terminée (le workflow « Front web » lance les mêmes, plus `build`).

Sous Windows, lancer Vitest depuis un chemin dont la lettre de lecteur est en **majuscule**
(`C:\…`) : avec `c:\…` (terminal de VS Code), Vitest charge deux fois son runner et tous les
fichiers échouent (« No test suite found », « failed to find the runner »).

Skills du front-end (`web/.claude/skills/`) : `web:review [périmètre]` (revue des modifications de
`web/`, sans rien modifier) et `web:test [cible]` (écrit et lance les tests Vitest d'une cible, ou
lance toute la suite et diagnostique les échecs).

## Architecture

BFF (_backend for frontend_) : le navigateur ne parle qu'au serveur Next.js ; c'est lui qui appelle
l'API avec le jeton de l'utilisateur. L'API n'a donc pas de CORS à ouvrir.

```
src/
  app/                  routes (App Router)
    (app)/              pages authentifiées, dans la coquille (barre latérale, en-tête)
    connexion/          seule page publique
    api/auth/           routes d'Auth.js
  components/           composants de l'application
    ui/                 composants shadcn/ui : générés, jamais modifiés à la main
  hooks/                hooks React
  lib/
    api/                accès à l'API : apiFetch, ApiError, types, une fonction par appel
    auth/               session, jetons, actions de connexion et de déconnexion
    constantes.ts       valeurs partagées
  auth.ts               configuration d'Auth.js (Keycloak, Authorization Code + PKCE)
  proxy.ts              protection des routes (ex-middleware) et renouvellement du jeton
```

- **Server Components par défaut** ; `"use client"` seulement pour l'interactivité (état, effets,
  événements, hooks du navigateur), sur le plus petit composant possible.
- Lectures dans les Server Components, écritures en Server Actions. Pas de bibliothèque de cache
  côté client.
- Un accès à la session ou à l'API dans une page est isolé dans un composant `async` placé sous
  `<Suspense>` avec un squelette (`Skeleton`) : le reste de la page est prérendu (`cacheComponents`).
- Valeur propre à chaque requête (`crypto.randomUUID()`, `Math.random()`, `Date.now()`) dans un
  rendu : la précéder de `await connection()` (`next/server`), sinon Next.js la refuse au prérendu
  (voir `apiFetch`).
- `src/components/ui/` : ajouter un composant par `npx shadcn@latest add <composant>`, ne jamais
  l'éditer (ni le reformater : exclu de Prettier). Pour l'adapter, l'envelopper dans un composant
  de `src/components/`.

## Accès à l'API

- **`apiFetch<T>()`** (`src/lib/api/client.ts`, `server-only`) est le seul accès à l'API : il ajoute
  le jeton et l'en-tête `X-Correlation-Id`, lit l'enveloppe `ApiResponse` et renvoie `data`, ou lève
  une `ApiError` (`statut`, `message` de l'API, `identifiantCorrelation`). Jamais de `fetch` direct
  vers l'API ailleurs.
- Une fonction par appel, regroupées par ressource (`src/lib/api/projets.ts` : `listerProjets`),
  typées avec les modèles de `modeles.ts`, eux-mêmes dérivés du schéma généré `schema.d.ts` (fichier
  versionné, jamais modifié à la main : `npm run api:types` après un changement de l'API).
- Listes paginées : `PageResponse<T>` ; page lue dans l'URL avec `lirePage()`, taille `TAILLE_PAGE`.
  Le tri est imposé par l'API.
- `PUT` : renvoyer la `version` lue ; un 409 propose de recharger la ressource.
- Les messages d'erreur de l'API (déjà en français, destinés à l'utilisateur) sont affichés tels
  quels, avec l'identifiant de corrélation comme référence (`AlerteErreur`). Les messages par défaut
  par statut sont dans `src/lib/api/erreurs.ts`.

## Sécurité

- **Le jeton ne quitte jamais le serveur** : il vit dans le cookie de session chiffré `httpOnly`
  d'Auth.js. La session exposée aux composants (`auth()`, callback `session`) n'en contient aucun ;
  ne jamais passer un jeton en prop à un Client Component, ni le journaliser.
- Tout module qui lit un jeton ou appelle l'API importe `server-only`.
- Variables `NEXT_PUBLIC_*` : jamais de secret ni d'URL interne (elles sont copiées dans le
  JavaScript du navigateur). Toute nouvelle variable est ajoutée, sans secret, à `web/.env.example`.
- **Les contrôles d'accès sont faits par l'API.** Le front ne fait que masquer les actions non
  autorisées (`estAdmin` de la session) ; une page ou une action ne suppose jamais qu'un bouton
  masqué suffit.
- Redirection après connexion : chemin relatif de l'application uniquement (`cheminDeRetour`).
- Aucune entrée utilisateur ni donnée de l'API injectée en HTML brut (`dangerouslySetInnerHTML`
  interdit) ; React échappe le texte.

## Conventions de code

- **Vocabulaire métier en français** (composants, fonctions, variables, messages, noms de tests) :
  `listerProjets`, `AlerteErreur`, `utilisateurCourant`. Le vocabulaire technique React/Next reste
  en anglais (`page.tsx`, `layout.tsx`, `props`, `children`).
- Composants en **PascalCase**, fichiers en **kebab-case** (`menu-utilisateur.tsx`), constantes en
  **UPPER_SNAKE_CASE**.
- Pas de nombre magique : valeurs significatives dans `src/lib/constantes.ts`.
- Indentation par tabulations, sans point-virgule (Prettier, `.prettierrc.json`) ; imports triés
  par groupe (bibliothèques, `@/…`, relatifs).
- Commentaire JSDoc sur les fonctions et composants exportés non évidents : rôle, `@param`,
  `@returns`, `@throws`.
- Dates et nombres : `date-fns` avec la locale `fr` et `Intl.NumberFormat("fr-FR")`, via
  `src/lib/format.ts`.
- Formulaires : react-hook-form + zod, avec les mêmes bornes que les DTO de l'API.
- Textes de l'interface en français ; `lang="fr"` sur la page.

## Accessibilité

- Composants Radix (shadcn/ui) pour tout élément interactif complexe (menu, dialogue, info-bulle).
- Chaque champ a un libellé ; un bouton réduit à une icône a un `aria-label`.
- Tout est utilisable au clavier ; la page courante est signalée (`aria-current="page"`).
- Les états de chargement ont un texte accessible (`aria-busy`, `aria-label`).

## Tests

- Vitest + Testing Library ; fichier `xxx.test.ts(x)` à côté du fichier testé.
- Noms de `describe` et `it` en français décrivant le comportement.
- Chaque règle s'accompagne d'un test du cas accepté **et** du cas refusé (ex. `cheminDeRetour` :
  chemins acceptés, destinations externes refusées).
- Composants : requêtes par rôle ou texte visible (`getByRole`), pas par classe CSS.
- Appels réseau simulés avec `vi.stubGlobal("fetch", …)`, variables avec `vi.stubEnv` (remis à zéro
  automatiquement, voir `vitest.config.mts`).
- Les tests E2E (Playwright) arriveront avec les écrans métier.
