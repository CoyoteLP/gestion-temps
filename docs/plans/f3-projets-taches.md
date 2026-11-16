# Plan : lot F3 — projets, tâches, membres et validation des comptes

> **État (2026-11-14)** : implémenté sur `feature/projets-taches` ; lint, format, types, 346 tests
> Vitest et build verts ; `web:review` faite et corrigée (tests ajoutés, titre de l'onglet = nom du
> projet, liste des utilisateurs extraite en composant testable). Parcours de bout en bout validé le 2026-11-14 (avec le lot F3a) ; pull request ouverte.
>
> Écarts avec le plan :
> - **409 en modification d'un projet** : l'API ne distingue pas un conflit de version d'un code en
>   double (même statut, messages différents). En création, un 409 ne peut être qu'un doublon : il
>   s'affiche sous le champ code ; en modification, le message de l'API s'affiche dans l'encadré de
>   conflit (avec « Recharger »). Idem pour un membre en double (sous le champ utilisateur).
> - Actions par ligne (tâches, membres) : boutons à icône avec `aria-label` plutôt qu'un menu.
> - Filtre des utilisateurs : liens (`?statut=`) plutôt que le composant `tabs`, non ajouté.
> - Seul le nom du projet est un lien vers sa fiche ; l'administrateur a en plus, en bout de ligne,
>   une icône « Modifier » qui ouvre directement le formulaire (demande du 2026-11-14).
> - `notFound()` est appelé après le début du streaming (garde du compte sous `<Suspense>`) :
>   la page « introuvable » s'affiche avec un statut 200 et `noindex`, comme le documente Next.js.
> - `EntreeNavigation` est sous `<Suspense>` : sur `/projets/[id]`, `usePathname` n'est connu qu'à
>   la requête (le build échouait sinon).
> - Royaume de dev : les comptes importés (`admin`, `jdupont`, `pmartin`) reçoivent
>   `default-roles-gestion-temps`, que Keycloak n'attribue pas aux comptes importés : sans lui, le
>   lien « Gérer mon compte de connexion » de la page Profil menait à une « erreur inattendue ».
> - Adapté au lot backend F3a (PR #28, fusionnée avant ce lot) : un collaborateur ne voit que les
>   projets dont il est membre (fiche d'un autre projet : message de l'API « Vous n'êtes pas membre
>   de ce projet ») ; rôle **Contributeur** dans le choix des membres, proposé par défaut ; types
>   régénérés (`npm run api:types`).
> - Correction au passage : les liens de pagination portaient un `aria-label` anglais (shadcn).

Deuxième lot d'écrans métier du front-end (`web/`), suite des plans
[`front-end-socle.md`](front-end-socle.md) et [F2](f2-inscription-profil.md). Aucun code Java ne
change : tous les endpoints existent déjà.

## Contexte

API utilisée (écriture réservée à l'administrateur, lecture pour tout compte actif) :

| Ressource | Endpoints | Règles utiles au front |
|---|---|---|
| Projets | `GET/POST /api/projets`, `GET/PUT/DELETE /api/projets/{id}` | code ≤ 20 et nom ≤ 100 obligatoires, description ≤ 1000, période facultative (fin ≥ début), `actif` ; suppression refusée (409) si le projet a des tâches |
| Tâches | `GET /api/taches?projetId=`, `POST`, `GET/PUT/DELETE /api/taches/{id}` | libellé ≤ 100 obligatoire, description ≤ 1000, `actif` ; suppression refusée (409) si la tâche a des saisies |
| Membres | `GET/POST /api/projets/{projetId}/membres`, `PUT/DELETE …/{id}` | `utilisateurId` et `role` (`MANAGER`, `BACKUP`) ; 409 si déjà membre |
| Utilisateurs | `GET /api/utilisateurs?actif=`, `PUT /api/utilisateurs/{id}` (admin seulement) | pas d'endpoint d'activation : `PUT` complet (email, nom, prénom, `actif`, `version`) |

Tout `PUT` exige la `version` lue (409 si périmée). Les listes sont paginées (100 au plus par page)
et triées par identifiant.

Décisions prises avec vous (2026-11-13) :

| Sujet | Décision |
|---|---|
| Membres de projet | **Inclus, administrateur seul** : section « Membres » de la fiche projet, ni affichée ni appelée pour les autres (ils ne peuvent pas lire les noms des utilisateurs). |
| Écran Utilisateurs | **Liste + activer / désactiver** : filtre « En attente » par défaut (Tous, Actifs, En attente), un bouton par ligne. Pas de création ni de modification de fiche. |
| Suppression | **Supprimer et désactiver** : bouton Supprimer avec confirmation ; si l'API refuse, son message (« désactivez-le plutôt ») est affiché. |
| Tâches | **Sur la fiche projet** `/projets/[id]` ; pas d'entrée « Tâches » dans la barre latérale. |

## 1. Liste des projets (`/projets`)

- La liste existante devient cliquable : le code et le nom mènent à la fiche `/projets/[id]`.
- Administrateur : bouton **« Nouveau projet »** dans l'en-tête de page, qui ouvre `/projets/nouveau`.

## 2. Fiche projet (`/projets/[id]`)

- **En-tête** : code, nom, statut (badge Actif / Inactif), période, description.
- Administrateur : boutons **« Modifier »** (`/projets/[id]/modifier`) et **« Supprimer »**
  (dialogue de confirmation ; succès → retour à la liste avec un toast ; refus 409 → message de
  l'API dans le dialogue).
- Projet introuvable (404) : page 404 de l'application (`notFound()`).
- **Tâches** : tableau paginé (libellé, description tronquée, statut), paramètre `page` dans l'URL.
  Administrateur : bouton « Nouvelle tâche » et, par ligne, menu « Modifier » / « Supprimer ».
  Création et modification dans un **dialogue** (deux champs et une case à cocher : pas besoin
  d'une page) ; la tâche reste dans son projet (`projetId` non modifiable).
- **Membres** (administrateur seulement) : tableau nom, prénom, email, rôle ; « Ajouter un
  membre » (dialogue : utilisateur parmi les fiches actives, rôle) ; par ligne, changement de rôle
  et retrait (confirmation). Les noms viennent de `GET /api/utilisateurs?actif=true`, lu en
  entier (pages de 100 successives) puis associé aux `utilisateurId` des membres ; un membre dont
  la fiche est inactive est complété par `GET /api/utilisateurs/{id}`.

## 3. Création et modification d'un projet

- Pages `/projets/nouveau` et `/projets/[id]/modifier`, même formulaire (react-hook-form + zod,
  mêmes bornes que `ProjetRequest`) : code, nom, description (zone de texte), date de début, date
  de fin (champs `type="date"` natifs : accessibles, sans nouvelle dépendance), case « Actif »
  (cochée par défaut à la création).
- Règle inter-champs « la fin ne précède pas le début » vérifiée par zod sur le champ date de fin.
- Succès : redirection vers la fiche et toast ; 409 de version : « Recharger » ; 409 de code en
  double : message sous le champ code ; 400 : erreurs par champ.
- Ces pages sont réservées à l'administrateur côté front aussi : un non-administrateur qui saisit
  l'URL reçoit la page 404 (l'API refuserait de toute façon l'enregistrement).

## 4. Utilisateurs (`/utilisateurs`, administrateur)

- Entrée **« Utilisateurs »** dans la barre latérale, affichée aux seuls administrateurs (la barre
  reçoit `estAdmin` de son layout serveur). Un non-administrateur qui saisit l'URL reçoit la page 404.
- Filtre par onglets ou liens `?statut=en-attente|actifs|tous` (en attente par défaut), lu dans
  l'URL comme la page.
- Tableau : nom, prénom, email, date d'inscription (`audit.creeLe`), statut ; bouton **« Activer »**
  ou **« Désactiver »** par ligne (Server Action : `PUT` de la fiche lue avec `actif` inversé et sa
  `version`) ; succès → toast et liste rafraîchie, 409 → message invitant à recharger.
- Désactiver demande une confirmation (l'utilisateur perd l'accès à l'API) ; activer non.

## 5. Accès à l'API, actions et composants

- `npm run api:types` si le schéma a bougé ; modèles `Tache`, `MembreProjet`, `RoleProjet` et
  types de requête dans `modeles.ts`.
- `src/lib/api/` : `projets.ts` (`lireProjet`, `creerProjet`, `modifierProjet`,
  `supprimerProjet`), `taches.ts`, `membres.ts`, `utilisateurs.ts` (`listerUtilisateurs(actif,
  page)`, `listerTousLesUtilisateursActifs`, `lireUtilisateur`, `modifierUtilisateur`).
- `apiFetch` : vérifier qu'il prend déjà en charge `POST`, `PUT`, `DELETE` avec corps ; un `DELETE`
  renvoie `data: null`.
- Server Actions par ressource : `src/lib/projets/actions.ts`, `src/lib/taches/actions.ts`,
  `src/lib/membres/actions.ts`, `src/lib/utilisateurs/actions.ts`, avec leurs schémas
  `schema-*.ts`. `EtatAction` devient générique sur les champs du formulaire et passe dans
  `src/lib/etat-action.ts`, partagé avec le profil ; la traduction d'une `ApiError` en état aussi.
- Composants : `FormulaireProjet`, `DialogueTache`, `DialogueMembre`, `ConfirmationSuppression`
  (dialogue générique : titre, message, action, erreur de l'API), `BoutonActivation`.
- Nouveaux composants shadcn : `textarea`, `checkbox`, `select`, `alert-dialog`, `tabs`
  (ajoutés par `npx shadcn@latest add`).
- Constantes : longueurs maximales (code 20, nom et libellé 100, description 1000), taille de page
  pour la lecture complète des utilisateurs (100, le maximum de l'API).
- Toutes les nouvelles pages sont dans le groupe `(compte-actif)`.

## 6. Documentation

- `web/CLAUDE.md` : pages réservées à l'administrateur (masquage et 404), `EtatAction` partagé,
  dialogue de confirmation.
- `README.md` (section Front-end web) : validation des comptes depuis l'écran Utilisateurs (remplace
  le `PUT` à la main décrit en F2).
- `front-end-socle.md` : ligne « État » (F2 fusionné, F3 en cours) ; ce plan : état final.
- PR `feat(web): ajouter les projets, les tâches et la validation des comptes`, fusion en squash
  après `web:review`.

## Tests (Vitest ; cas accepté et cas refusé pour chaque règle)

- Fonctions d'API : bons chemins, méthodes et corps (`version` en `PUT`), `projetId` en
  paramètre des tâches, lecture complète des utilisateurs sur plusieurs pages.
- Schémas : projet (code et nom obligatoires, longueurs, fin avant début refusée, période
  ouverte acceptée), tâche, membre.
- Server Actions : succès, 400 → erreurs par champ, 409 → conflit, 404/422 → erreur ; activation
  envoie la fiche complète avec `actif` inversé.
- Composants : boutons d'administration absents pour un non-administrateur ; formulaire de projet
  (erreurs, bouton désactivé pendant l'envoi) ; dialogue de suppression (refus affiché) ; filtre
  des utilisateurs ; entrée « Utilisateurs » de la barre selon le rôle.

## Vérification

- Dans `web/` : `lint`, `format:check`, `typecheck`, `test`, `build` verts ; workflow « Front web »
  vert sur la PR. `./mvnw verify` inchangé (aucun code Java modifié).
- De bout en bout avec le Keycloak de dev et l'API :
  1. `admin` : créer un projet (période invalide refusée, code en double refusé), le modifier,
     le désactiver ;
  2. ajouter, modifier, supprimer une tâche ; supprimer un projet qui a des tâches → refus avec
     le message de l'API ; supprimer un projet vide → retour à la liste ;
  3. ajouter `jdupont` comme membre, changer son rôle, le retirer ; l'ajouter deux fois → refus ;
  4. un compte inscrit apparaît dans « En attente » ; « Activer » → il accède aux projets après
     rechargement ; « Désactiver » → « Compte en attente de validation » ;
  5. `jdupont` : liste et fiche projet en lecture, tâches visibles, ni boutons d'administration,
     ni section Membres, ni entrée Utilisateurs ; `/projets/nouveau` et `/utilisateurs` → 404 ;
  6. modification concurrente d'un projet dans deux onglets → 409 et « Recharger ».

## Hors périmètre

- Création, modification et suppression de fiches utilisateur par l'administrateur (seule
  l'activation est couverte).
- Affichage de l'audit (créé par, modifié le) sur les fiches, sauf la date d'inscription des
  utilisateurs.
- Clôtures de mois et saisies : lot F4.
- Recherche ou tri choisis par l'utilisateur dans les listes (tri imposé par l'API) : lot F3b,
  décidé le 2026-11-14 (voir [`front-end-socle.md`](front-end-socle.md), feuille de route).
- Tests E2E Playwright : lot F5.
