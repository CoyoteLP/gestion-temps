---
name: review
description: Revue de code des modifications du front-end web (web/) de gestion-temps au regard des conventions de web/CLAUDE.md (Server/Client Components, apiFetch, composants shadcn, nommage, tests), de la sécurité (jeton jamais côté client, HTML brut, variables NEXT_PUBLIC_*, redirections), de l'accessibilité et de la performance (requêtes en cascade, taille du bundle). À utiliser quand on demande une revue ou une vérification des changements du front avant commit ou PR.
argument-hint: "[fichier, dossier ou branche à comparer] (défaut : modifications non commitées de web/)"
---

# Revue de code — front-end web

Relire les modifications de `web/` et signaler les écarts. **Ne rien modifier** : la revue produit
un rapport ; les corrections ne sont appliquées que si l'utilisateur le demande ensuite.

## 1. Déterminer le périmètre

- Argument fourni (`$ARGUMENTS`) : un fichier ou dossier → ce périmètre ; un nom de branche →
  `git diff <branche>...HEAD -- web/`.
- Sans argument : `git diff HEAD -- web/` **et** les fichiers non suivis (`git status --short web/`).
- Lire chaque fichier modifié en entier, pas seulement le diff.
- `src/components/ui/` (shadcn) et `src/lib/api/schema.d.ts` (généré) ne sont pas relus ligne à
  ligne ; signaler seulement une modification à la main (_À corriger_).

## 2. Relire les conventions

Relire `web/CLAUDE.md` et la partie « Commun » du `CLAUDE.md` racine : ce sont les références ; en
cas de divergence avec ce qui suit, elles font foi. Pour une API de Next.js, vérifier dans
`web/node_modules/next/dist/docs/` plutôt que de se fier à sa mémoire (version récente).

## 3. Points de contrôle

**Architecture**

- Server Component par défaut ; `"use client"` justifié (état, effets, événements) et posé sur le
  plus petit composant possible, pas sur une page entière.
- Lecture de la session ou de l'API isolée dans un composant `async` sous `<Suspense>` avec un
  squelette.
- Écritures en Server Actions ; pas de route API maison qui relaie l'API sans raison.
- Tout appel à l'API passe par `apiFetch` (via une fonction de `src/lib/api/`), jamais un `fetch`
  direct ; `ApiError` traitée pour afficher le message de l'API et l'identifiant de corrélation.
- `PUT` avec la `version` lue ; un 409 propose de recharger.

**Conventions**

- Vocabulaire métier en français ; composants en PascalCase, fichiers en kebab-case.
- Pas de nombre magique : `src/lib/constantes.ts`.
- Types : pas de `any`, pas d'assertion `as` qui masque une erreur ; modèles dérivés du schéma
  généré (`modeles.ts`).
- JSDoc sur les fonctions et composants exportés non évidents.
- `web/.env.example` complété pour toute nouvelle variable ; `README.md` mis à jour si le démarrage
  change.

**Tests**

- Toute nouvelle règle ou fonction a un test du cas accepté **et** du cas refusé.
- Requêtes Testing Library par rôle ou texte visible.

## 4. Sécurité

- **Jeton** : aucun jeton (accès, refresh, id) dans une prop de Client Component, dans la session
  exposée (callback `session`), dans une réponse de Server Action, dans un log ou dans une URL ;
  _Bloquant_ sinon. Un module qui lit un jeton importe `server-only`.
- **HTML brut** : pas de `dangerouslySetInnerHTML`, ni d'URL `javascript:` construite à partir
  d'une donnée ; _Bloquant_ si une entrée utilisateur ou une donnée de l'API y arrive.
- **Variables d'environnement** : une variable `NEXT_PUBLIC_*` ne contient ni secret ni URL interne.
- **Redirections** : toute destination issue d'un paramètre passe par `cheminDeRetour`
  (redirection ouverte sinon, _Bloquant_).
- **Contrôle d'accès** : le front masque des actions mais ne protège rien ; signaler un écran qui
  suppose qu'un bouton masqué suffit, ou une page oubliée par le `matcher` de `src/proxy.ts`.
- **Server Actions** : ce sont des points d'entrée publics ; leurs arguments sont validés (zod) et
  jamais crus (identifiant d'un autre utilisateur, rôle…).
- **Dépendances** : nouvelle dépendance justifiée, maintenue, sans script d'installation suspect ;
  `package-lock.json` mis à jour.

## 5. Accessibilité

- Élément interactif complexe → composant Radix (shadcn/ui) ; pas de `div` cliquable.
- Libellé sur chaque champ ; `aria-label` sur les boutons icône ; texte alternatif sur les images.
- Navigation au clavier possible ; focus visible ; `aria-current` sur la page courante.
- Contraste respecté dans les thèmes clair et sombre (variables du thème, pas de couleur en dur).

## 6. Performance

- **Requêtes en cascade** : appels à l'API indépendants faits l'un après l'autre (`await` successifs)
  → `Promise.all`, ou composants frères sous des `<Suspense>` distincts. Indiquer le nombre d'allers
  et retours.
- Même donnée lue plusieurs fois dans un rendu sans `cache()` de React.
- **Bundle** : grosse bibliothèque importée dans un Client Component, `"use client"` trop haut dans
  l'arbre, import d'un module serveur côté client.
- Liste non paginée sur une ressource qui grossit (saisies) ; images sans `next/image`.

## 7. Vérifier

Lancer depuis `web/` (sous Windows, chemin avec `C:` en majuscule pour Vitest) :

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

Indiquer le résultat (nombre de tests, sortie exacte des échecs). Ne signaler un problème que s'il
est **avéré** dans le code relu : citer la ligne, pas une supposition.

## 8. Rapport

Répondre en français, constats classés du plus grave au moins grave :

```
### Bloquant      — bug, faille, jeton exposé, test en échec
### À corriger    — écart à une convention de web/CLAUDE.md
### Suggestion    — amélioration facultative
```

Pour chaque constat : sa catégorie (`[Conventions]`, `[Sécurité]`, `[Accessibilité]` ou
`[Performance]`), le lien `[fichier.tsx:42](web/src/chemin#L42)`, le problème en une phrase, la règle
concernée et la correction proposée. Terminer par le résultat des vérifications et, s'il n'y a aucun
constat, le dire clairement plutôt que d'en inventer.
