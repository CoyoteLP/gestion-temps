# Plan : lot F1 — compte de l'utilisateur connecté et auto-inscription

> **État (2026-11-11)** : implémenté sur `feature/utilisateur-moi` ; `./mvnw verify` vert (341 tests) ;
> parcours de bout en bout vérifié avec le Keycloak de dev (inscription, 422 sans email vérifié,
> 201 avec fiche inactive, activation par l'administrateur, accès à `/api/projets`).
> Reste : revue, PR.

Lot backend qui prépare les écrans d'inscription et de profil (F2). Suite du plan
[`front-end-socle.md`](front-end-socle.md). Branche `feature/utilisateur-moi`, depuis `develop`.

## Contexte

Aujourd'hui, seul un administrateur crée les fiches `Utilisateur` ; un compte Keycloak est rattaché
à sa fiche par l'email vérifié du jeton, puis par `sub`. Ouvrir l'auto-inscription dans Keycloak
change la nature de « authentifié » : n'importe qui peut obtenir un jeton valide. Or :

- tout jeton valide lit projets, tâches et utilisateurs (`GET /api/** → authenticated`), emails
  compris, et les champs d'audit (`creePar`, `modifiePar`) contiennent l'email des auteurs ;
- un utilisateur actif peut saisir du temps sur n'importe quelle tâche active
  (`SaisieTempsService.create` ne vérifie pas l'appartenance au projet).

Décisions prises avec vous (2026-11-11) :

| Sujet | Décision |
|---|---|
| Nouvel inscrit | Fiche créée **inactive** ; un administrateur l'active. Toute l'API exige un utilisateur connu et actif (sauf `/moi`), ou le rôle administrateur. |
| Création de la fiche | `POST /api/utilisateurs/moi`, explicite ; le front l'appellera automatiquement après la première connexion (F2). |
| Lecture des utilisateurs | `GET /api/utilisateurs` et `/{id}` réservés à l'administrateur ; chacun lit sa fiche par `/moi`. |
| Audit | `audit` renvoyé seulement à l'administrateur (`null` pour les autres). |
| Emails en dev | Pas de serveur d'emails : un administrateur coche « Email verified » dans la console Keycloak. |

## Endpoints `/api/utilisateurs/moi`

Accessibles à tout authentifié, même sans fiche ou avec une fiche inactive (c'est par eux qu'un
inscrit voit où en est son compte).

| Méthode | Effet | Réponses |
|---|---|---|
| `GET` | Fiche de l'appelant (recherche par `sub`, puis rattachement par email vérifié comme aujourd'hui) | 200 avec `actif` (false = en attente de validation) ; 404 « Votre compte n'est pas encore enregistré » |
| `POST` | Crée la fiche depuis le jeton : email (vérifié obligatoire), `family_name` → nom, `given_name` → prénom, `sujet` = `sub`, **`actif = false`** ; sans corps | 201 + `Location: /api/utilisateurs/moi` ; 409 si une fiche existe déjà pour ce compte ou cet email ; 422 si l'email n'est pas vérifié ou si le nom ou le prénom manquent dans le jeton |
| `PUT` | Modifie **nom et prénom** seulement (`ProfilRequest { nom, prenom, version }`) ; l'email est géré par Keycloak, `actif` par l'administrateur | 200 ; 404 sans fiche ; 409 si version périmée ; 400 si invalide |

Une fiche créée à l'avance par un administrateur continue d'être rattachée par email à la première
connexion : pour ces comptes, `POST` répond 409 et `GET` renvoie la fiche (active).

## Contrôle d'accès

- `SecurityConfig` :
  - `/api/utilisateurs/moi` : tout authentifié ;
  - `GET /api/utilisateurs/**` : administrateur ;
  - toutes les autres routes `/api/**` : rôle administrateur, **ou** utilisateur connu et actif (en
    plus des règles par rôle existantes). Vérifié par un `AuthorizationManager` qui s'appuie sur
    `UtilisateurCourantService` : une requête indexée sur `utilisateur.sujet` par appel.
- Refus : 403, avec un message selon le cas : sans fiche et email non vérifié, « Votre adresse
  email doit être vérifiée… » (comme `POST /moi`) ; sans fiche, « Aucun utilisateur ne correspond
  à votre compte… » ; fiche inactive, « Votre compte n'est pas actif… ».
- Un administrateur n'a toujours pas besoin de fiche.
- Les règles fines (« ses propres saisies », membres) ne changent pas.

## Audit réservé à l'administrateur

Un sérialiseur Jackson de `AuditResponse` (dans `config`) écrit `null` quand l'appelant n'est pas
administrateur. Les DTO et services ne changent pas.

## Liste des comptes à valider

`GET /api/utilisateurs` prend un filtre facultatif `actif` (`?actif=false` : comptes en attente),
pour l'écran d'administration de F3. L'activation existe déjà : `PUT /api/utilisateurs/{id}` avec
`actif: true`.

## Keycloak de dev

`docker/keycloak/realm-gestion-temps.json` : `registrationAllowed: true`, `verifyEmail: false` (pas
de SMTP en dev ; un administrateur coche « Email verified » à la main). Le formulaire d'inscription
de Keycloak demande déjà prénom et nom.
En production, l'inscription exigera `verifyEmail: true` et un serveur SMTP : à documenter dans
`docs/DEPLOIEMENT.md` (exigences du fournisseur OIDC).

## Documentation

- `README.md` : endpoints `/moi`, lecture des utilisateurs réservée à l'admin, `audit` réservé à
  l'admin, parcours d'inscription et de validation en dev.
- `CLAUDE.md` : section Sécurité (« lecture pour tout utilisateur actif ou administrateur ») et
  Règles métier (nouvel inscrit inactif jusqu'à validation).
- Changement incompatible de l'API, donc PR intitulée
  `feat(utilisateur)!: ajouter le compte de l'utilisateur connecté et l'auto-inscription`. Il sera
  signalé dans le CHANGELOG de la prochaine version.

Aucune migration Flyway : `utilisateur.sujet` (unique) et `actif` existent déjà.

## Tests (cas accepté et cas refusé pour chaque règle)

- `UtilisateurControllerTest` :
  - `GET /moi` : fiche active, fiche inactive, sans fiche (404) ;
  - `POST /moi` : création inactive, puis 409 si déjà créée, 409 si l'email appartient à une autre
    fiche rattachée, 422 si l'email n'est pas vérifié, 422 si le nom manque ;
  - `PUT /moi` : modification, version périmée (409), champs invalides (400) ; `actif` et email
    inchangés ;
  - filtre `actif`.
- `SecurityConfigTest` :
  - liste et fiche d'un utilisateur : admin 200, collaborateur 403 ;
  - `GET /api/projets` : utilisateur actif 200, utilisateur inactif 403, jeton sans fiche 403,
    admin sans fiche 200 ;
  - `/moi` accessible sans fiche.
- Audit : `audit` présent pour l'admin, `null` pour un collaborateur.
- Tests existants qui lisent l'API avec un jeton sans fiche (`.with(jwt())`) : à adapter (ils
  attendront désormais 403, ou recevront une fiche active).

## Vérification

- `./mvnw verify` vert (couverture du paquet `service` comprise).
- Avec le Keycloak de dev réimporté :
  1. s'inscrire depuis la page de connexion Keycloak ;
  2. cocher « Email verified » dans la console ;
  3. `POST /moi` → 201, fiche inactive ;
  4. `GET /api/projets` → 403 « en attente de validation » ;
  5. activation par l'admin, puis `GET /api/projets` → 200.

## Hors périmètre

- Écrans d'inscription et de profil : lot F2.
- Synchronisation de l'email si l'utilisateur le change dans Keycloak : à traiter si le besoin
  apparaît.
- Restreindre la saisie aux membres du projet : inutile tant que les inscrits sont validés par un
  administrateur ; à rediscuter si cette validation disparaît.
