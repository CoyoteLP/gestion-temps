# Plan : socle technique du front-end web de gestion-temps

> **État (2026-11-11)** : lot F0 livré sur `feature/front-socle`, vérifié de bout en bout. Écarts
> avec le plan initial : Next.js 16 (`proxy.ts` au lieu de `middleware.ts`) ; Auth.js gardé alors
> qu'il est encore en bêta (`next-auth` 5.0.0-beta.32), choix à réexaminer au lot F5.

## Contexte

L'API gestion-temps est en production (v1.0.0 ; `develop` est en 1.1.0). Il faut maintenant un
front-end web qui permette aux utilisateurs de :
- se connecter et s'inscrire ;
- consulter et modifier leur profil ;
- gérer projets, tâches et saisies de temps.

**Ce premier temps ne couvre que le socle technique** : un squelette qui fonctionne de bout en bout
(connexion Keycloak → appel à l'API → page affichée), avec l'outillage, la CI et les conventions.
Les écrans métier viendront dans les lots suivants (voir la feuille de route).

Décisions prises avec vous :
- **Monorepo** : le front va dans le dossier `web/` de ce dépôt et suit le même Git Flow.
- **Authentification en BFF** : Next.js + Auth.js. Les jetons restent côté serveur, dans un cookie
  chiffré `httpOnly`. Les appels à l'API partent du serveur Next.js, donc l'API n'a pas de CORS à ouvrir.
- **Inscription** : auto-inscription dans Keycloak, puis création automatique de l'`Utilisateur` à la
  première connexion. Cela demande un lot backend (F1).
- **Projets et tâches** : la règle actuelle reste (écriture réservée à l'admin). Les écrans
  d'édition ne s'afficheront qu'aux administrateurs.

Constats sur l'API qui orientent le socle :
- Toutes les réponses sont enveloppées : `ApiResponse { status, data, message }`.
- Les listes sont paginées : `PageResponse { contenu, page, taille, total, pages }`.
- Tout `PUT` exige le champ `version` ; une version périmée renvoie 409.
- Les réponses ne portent que des identifiants (`projetId`, `tacheId`) : c'est le front qui affiche les libellés.
- Le royaume Keycloak de dev n'a qu'un client `gestion-temps-dev`, en password grant, sans flux
  standard ni redirect URI : il faut ajouter un client pour le web.
- springdoc expose `/v3/api-docs` : on peut en générer les types TypeScript.

## Stack retenue

| Besoin | Choix |
|---|---|
| Framework | **Next.js** (dernière version stable, App Router, `src/`), React, TypeScript `strict` |
| Style | **Tailwind CSS** v4 |
| Composants | **shadcn/ui** (Radix), icônes lucide-react, thème clair et sombre (`next-themes`) |
| Authentification | **Auth.js** (`next-auth` v5), fournisseur Keycloak, Authorization Code + PKCE, renouvellement du jeton par refresh token, déconnexion côté Keycloak (`end_session`). Avant l'installation, vérifier l'état de maintenance d'Auth.js ; s'il n'est plus maintenu, utiliser `openid-client` avec une session `iron-session`, sans changer l'architecture BFF. |
| Données | Lecture dans les Server Components, écritures en Server Actions. Pas de bibliothèque de cache côté client pour l'instant. |
| Formulaires | react-hook-form + zod, avec le composant Form de shadcn ; mêmes bornes que les DTO |
| Types d'API | `openapi-typescript`, généré depuis `/v3/api-docs` de l'API de dev (`npm run api:types`). Le fichier généré est versionné. |
| Dates et nombres | `date-fns` avec la locale `fr`, `Intl.NumberFormat('fr-FR')` |
| Qualité | ESLint (config Next), Prettier (tabulations, comme `.editorconfig`), `tsc --noEmit` |
| Tests | Vitest + Testing Library pour les composants et le client d'API. Playwright (E2E) viendra avec les écrans métier. |
| Gestionnaire de paquets | npm (Node 22 est déjà installé), `package-lock.json` versionné |

## Mise en place : lot F0, branche `feature/front-socle`

1. **Initialiser le projet** :
   - `npx create-next-app@latest web` : TypeScript, App Router, Tailwind, ESLint, dossier `src/`,
     alias `@/*` ;
   - `npx shadcn@latest init`, puis les composants de base : button, card, input, label, form,
     table, dropdown-menu, avatar, sidebar, sonner, skeleton, badge, dialog, pagination ;
   - `web/package.json` en version 1.1.0, alignée sur `pom.xml`.
2. **Authentification** :
   - `web/src/auth.ts` : fournisseur Keycloak, rôles lus dans la revendication `roles` pour
     afficher ou masquer les actions d'administration, `accessToken` et `refreshToken` dans le JWT
     de session, renouvellement à l'expiration ;
   - `src/proxy.ts` (nom du middleware depuis Next.js 16) protège toutes les routes sauf
     `/connexion` et `/api/auth/*` ;
   - pages `/connexion` (bouton « Se connecter avec Keycloak ») et déconnexion.
3. **Client d'API côté serveur** (`web/src/lib/api/`) :
   - `apiFetch<T>()` (`server-only`) ajoute `Authorization: Bearer`, lit l'enveloppe `ApiResponse`
     et lève une `ApiError` qui porte `status`, `message` (français, celui de l'API) et
     `X-Correlation-Id` ;
   - types `ApiResponse<T>` et `PageResponse<T>`, plus les types générés `schema.d.ts` ;
   - helpers de pagination (`page`, `taille`) ;
   - les erreurs 401, 403, 404, 409 et 422 sont traduites en messages affichables (toast ou
     encadré). Un 409 de version propose de recharger la ressource.
4. **Coquille de l'application** :
   - layout authentifié : barre latérale avec Saisies, Projets et Profil ;
   - en-tête avec le menu utilisateur (nom, déconnexion) et le choix du thème ;
   - `lang="fr"`, page d'erreur et page 404 en français, états de chargement (skeleton).
5. **Page témoin** `/projets` : liste paginée en lecture (code, nom, période, actif), servie par un
   Server Component. Elle valide la chaîne complète sans anticiper les écrans du lot F3.
6. **Keycloak de dev** (`docker/keycloak/realm-gestion-temps.json`) :
   - nouveau client **public** `gestion-temps-web`, flux standard et PKCE S256 ;
   - redirect URI `http://localhost:3000/api/auth/callback/keycloak`, web origin et URI de
     redirection après déconnexion `http://localhost:3000` ;
   - mêmes mappers que `gestion-temps-dev` (audience `gestion-temps-api`, revendication `roles`).
     Le client existant reste en place.
7. **Configuration** :
   - `web/.env.example` : `AUTH_SECRET`, `AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_ISSUER`, `API_URL`
     (par défaut `http://localhost:8080`), sans secret ;
   - `web/.env.local` est ignoré par Git.
8. **Dépôt et CI** :
   - `.gitignore` : `node_modules/`, `.next/`, `out/`, `*.tsbuildinfo`, `next-env.d.ts`,
     `web/.env*` sauf `.env.example` ;
   - nouveau `.github/workflows/web.yml` (« Front web »), déclenché sur `web/**` (push et PR vers
     develop et main) : `npm ci`, lint, `tsc`, `vitest run`, `next build`.
     `ci.yml` ne change pas, pour que la vérification obligatoire « Build et tests » s'exécute
     toujours ;
   - `.github/dependabot.yml` : écosystème npm, `directory: /web`, regroupement des mises à jour mineures ;
   - `.github/workflows/codeql.yml` : ajouter le langage `javascript-typescript`.
9. **Configuration Claude séparée entre backend et front-end** (choix : le backend reste à la racine) :
   - **`CLAUDE.md` racine**, réorganisé en deux parties sans changer les règles :
     - « Commun » : présentation du monorepo, Git Flow, branches, commits, versions, qualité,
       communication ;
     - « Backend (API Java) » : commandes Maven, architecture, conventions de code, sécurité,
       exploitation, format des réponses, règles métier, tests, base de données, interdictions.
     - Une phrase en tête précise que la partie Backend ne s'applique pas sous `web/`, qui a son
       propre `web/CLAUDE.md`.
     - Ajouts au commun : la portée `web` pour les commits (`feat(web): …`) et la version de
       `web/package.json`, alignée sur celle de `pom.xml`.
   - **`web/CLAUDE.md`** (nouveau), conventions du front :
     - commandes (`npm run dev`, `lint`, `test`, `build`, `api:types`) ;
     - arborescence (`src/app`, `src/components`, `src/components/ui` réservé à shadcn et jamais
       modifié à la main, `src/lib/api`) ;
     - Server Components par défaut, `"use client"` seulement si nécessaire ;
     - `apiFetch` comme seul accès à l'API, et le jeton jamais exposé au client ;
     - contrôles d'accès faits par l'API : le front ne fait que masquer des actions ;
     - vocabulaire métier en français, composants en PascalCase, fichiers en kebab-case, tabulations ;
     - messages d'erreur de l'API affichés tels quels ;
     - accessibilité (composants Radix, libellés, navigation au clavier) ;
     - tests Vitest, avec un test du cas accepté et du cas refusé.
   - **Skills du front** dans `web/.claude/skills/`, en plus de ceux du backend qui restent dans `.claude/skills/` :
     - `review` (apparaît comme `web:review`) : conventions de `web/CLAUDE.md` ;
       sécurité (jeton jamais côté client, aucune entrée injectée en HTML brut, variables
       `NEXT_PUBLIC_*` sans secret) ; accessibilité ; performance (Server vs Client Components,
       requêtes en cascade, taille du bundle) ; lance lint, `tsc` et les tests ;
     - `test` (apparaît comme `web:test`) : écrit et lance les tests Vitest d'une cible, ou lance
       toute la suite front et en diagnostique les échecs.
   - `settings.json` (permissions, hooks) existe uniquement à la racine : il reste commun. On y ajoutera
     au besoin les commandes `npm` en lecture seule.
   - **`README.md`** : section « Front-end web » (prérequis, démarrage avec Keycloak et l'API).
10. PR intitulée `feat(web): mettre en place le socle du front-end Next.js`, fusionnée en squash, après `/review`.

Fichiers clés :
- nouveaux : `web/**` (dont `web/CLAUDE.md` et `web/.claude/skills/{review,test}/SKILL.md`),
  `.github/workflows/web.yml` ;
- modifiés : `docker/keycloak/realm-gestion-temps.json`, `.gitignore`, `.github/dependabot.yml`,
  `.github/workflows/codeql.yml`, `CLAUDE.md`, `README.md`.

Aucun code Java ne change dans ce lot.

## Feuille de route après le socle (pour information, à valider lot par lot)

- **F1 (backend)** : endpoint `GET` et `PUT /api/utilisateurs/moi`. Création automatique de
  l'`Utilisateur` à la première connexion (email vérifié, nom et prénom du jeton), puis
  `registrationAllowed` dans le royaume, migration si nécessaire, tests. Point à trancher :
  aujourd'hui tout authentifié lit la liste de tous les utilisateurs, emails compris.
- **F2** : écrans connexion et inscription, page Profil (consultation et modification).
- **F3** : projets et tâches. Consultation pour tous, création et modification réservées aux administrateurs.
- **F4** : saisies de temps (choix du projet puis de la tâche, saisie par jour ou par semaine,
  total journalier, mois clôturés en lecture seule).
- **F5** : déploiement du front (sortie `standalone`, image, `docs/DEPLOIEMENT.md`) et tests E2E Playwright.
  Avant la mise en production, réexaminer Auth.js : au lot F0, `next-auth` v5 n'existait qu'en
  bêta (5.0.0-beta.32, dernière publication en juillet 2026). S'il n'a toujours pas de version
  stable maintenue, passer à `openid-client` + `iron-session` (seuls `src/auth.ts` et
  `src/lib/auth/` sont concernés, l'architecture BFF ne change pas).
  Relevés à la revue du lot F0, à traiter aussi en F5 :
  - **en-têtes de sécurité HTTP** dans `next.config.ts` : `Content-Security-Policy` (à nonce, comme
    le recommande Next.js) avec `frame-ancestors 'none'` contre le clickjacking, `Referrer-Policy`,
    `X-Content-Type-Options` ;
  - **renouvellement du jeton en double** juste après son expiration : le proxy renouvelle et pose
    un nouveau cookie, mais la page lit encore l'ancien et renouvelle une seconde fois
    (`jetonAcces`, `src/lib/auth/session.ts`). Sans risque tant que le Keycloak ne révoque pas les
    refresh tokens déjà utilisés (`revokeRefreshToken`, désactivé en dev) ; si la production l'active,
    l'utilisateur serait déconnecté. Vérifier ce réglage et, au besoin, ne renouveler qu'à un seul
    endroit.

## Vérification du lot F0

- Dans `web/` : `npm run lint`, `npx tsc --noEmit`, `npm test` et `npm run build` passent.
- Bout en bout en local :
  1. lancer Keycloak (`docker compose -f docker/keycloak/compose.yaml up -d`, puis réimport du
     royaume) et l'API (`./mvnw spring-boot:run`) ;
  2. lancer le front (`npm run dev`) ;
  3. sans session, `/projets` redirige vers `/connexion` ;
  4. la connexion `jdupont` / `jdupont` affiche la liste paginée des projets ;
  5. le jeton n'apparaît ni dans le JavaScript ni dans le stockage du navigateur (cookie `httpOnly`
     seulement) ;
  6. après la déconnexion, la session Keycloak est fermée ;
  7. l'API arrêtée, une erreur en français s'affiche, avec l'identifiant de corrélation.
- `./mvnw test` reste vert, puisque le backend ne change pas. Le workflow « Front web » est vert sur la PR.
