# Plan : lot F3a (backend) — projets et saisies réservés aux membres du projet

> **État (2026-11-14)** : plan validé (422 pour la saisie d'un non-membre, migration V6, libellés) et
> implémenté sur `feature/projets-membres` ; `./mvnw verify` vert ; `/review` faite et corrigée.
>
> Écarts avec le plan :
> - les rôles responsables (`MANAGER`, `BACKUP`) sont déclarés dans l'énumération
>   (`RoleProjet.RESPONSABLES`) plutôt que dans `Constantes` : ce n'est pas un seuil, et l'ensemble
>   se lit à côté des rôles qu'il regroupe ;
> - un collaborateur qui filtre les tâches ou les clôtures sur un projet **inexistant** reçoit 403
>   (comme pour un projet hors de son périmètre), et non 404 ;
> - le `CHANGELOG.md` sera complété sur la branche de release 1.1.0 (migration V6, arrêt complet),
>   comme le prévoit la convention ; `docs/DEPLOIEMENT.md` l'est dès cette PR. Lot demandé pendant la vérification de F3 (un
> collaborateur voyait tous les projets) ; à fusionner **avant** la PR du lot F3, qui sera ensuite
> adapté (rôle Contributeur).

Lot backend, comme [F1](f1-utilisateur-moi.md), dans la suite du plan
[`front-end-socle.md`](front-end-socle.md).

## Contexte

Aujourd'hui, tout compte actif lit **tous** les projets, leurs tâches, leurs membres et leurs
clôtures, et saisit du temps sur **n'importe quelle** tâche active. L'appartenance à un projet
(`MembreProjet`, rôles `MANAGER` et `BACKUP`) ne sert qu'à consulter les saisies des autres membres
et à clôturer un mois.

Décisions prises avec vous (2026-11-14) :

| Sujet | Décision |
|---|---|
| Visibilité | Un collaborateur (non administrateur) ne voit que les projets **dont il est membre**, quel que soit son rôle. L'administrateur voit tout, comme aujourd'hui. |
| Rôles | Nouveau rôle **`CONTRIBUTEUR`** : voit le projet et saisit son temps, sans voir les saisies des autres ni clôturer. `MANAGER` (Responsable) et `BACKUP` (Suppléant) gardent leurs droits. |
| Saisie | Réservée aux **membres** du projet (tout rôle). |
| Projet hors périmètre | **403** « accès refusé » (et non 404). |
| Calendrier | Lot backend fusionné avant la PR F3. |

## 1. Rôle Contributeur

- `RoleProjet` : ajout de `CONTRIBUTEUR`. La colonne `membre_projet.role` (`varchar(20)`) l'accepte
  déjà : **pas de changement de schéma**.
- `MembreProjetService` : `estMembre(projetId, utilisateurId)` (tout rôle, visibilité et saisie) et
  nouveau `estResponsable(projetId, utilisateurId)` (`MANAGER` ou `BACKUP` : saisies des autres,
  clôture). Repository : `existsByProjetIdAndUtilisateurIdAndRoleIn`.
- Constantes : l'ensemble des rôles responsables dans `Constantes` (pas de liste en dur dans le service).

## 2. Visibilité (lecture), pour un non-administrateur

Les contrôles sont faits dans les services, via `UtilisateurCourantService`, en levant
`AccesRefuseException` (403) ; `SecurityConfig` ne change pas (règles grossières par URL).

| Endpoint | Nouveau comportement |
|---|---|
| `GET /api/projets` | Projets dont il est membre seulement (requête JPQL dans `ProjetRepository`, tri par id inchangé). |
| `GET /api/projets/{id}` | 403 s'il n'est pas membre (404 si le projet n'existe pas). |
| `GET /api/taches?projetId=` | 403 s'il n'est pas membre du projet ; sans `projetId` : tâches de ses projets seulement. |
| `GET /api/taches/{id}` | 403 s'il n'est pas membre du projet de la tâche. |
| `GET /api/projets/{id}/membres` et `/{membreId}` | 403 s'il n'est pas membre. Un membre (tout rôle) voit la liste. |
| `GET /api/clotures?projetId=` et `/{id}` | 403 s'il n'est pas membre ; sans `projetId` : clôtures de ses projets seulement. |

Message : « Vous n'êtes pas membre de ce projet ».

## 3. Saisies

- **Création, ou modification qui change de tâche** : l'utilisateur **de la saisie** doit être
  membre du projet de la tâche, sinon **422** (`BusinessRuleException`, « L'utilisateur n'est pas
  membre du projet ») — même si c'est un administrateur qui saisit pour lui, et comme les règles
  « ressource inactive ». Une saisie existante reste corrigeable (durée, jour, commentaire) après le
  retrait du membre, comme après une désactivation.
- **Consultation des saisies des autres** (`search` filtré sur un projet ou une tâche, `findById`) :
  réservée à `MANAGER` et `BACKUP` (`estResponsable`). Un contributeur ne voit que les siennes.
  Chacun garde l'accès à ses propres saisies, même sur un projet dont il n'est plus membre.
- **Clôture** d'un mois : administrateur, `MANAGER` ou `BACKUP` ; refusée (403) à un contributeur.

## 4. Données existantes (production en v1.0.0)

Après la mise à jour, un collaborateur qui n'est membre d'aucun projet ne voit plus rien et ne peut
plus saisir. Proposition : migration **`V6__contributeurs_des_saisies_existantes.sql`** qui ajoute
comme `CONTRIBUTEUR` chaque utilisateur ayant déjà saisi sur un projet dont il n'est pas membre
(`insert … select distinct` depuis `saisie_temps` et `tache`, `cree_par = 'migration V6'`). Les
autres membres restent à déclarer par l'administrateur.

**Mise à jour progressive impossible** : une instance en v1.0.0 ne sait pas lire le rôle
`CONTRIBUTEUR` (`@Enumerated`) et échouerait sur tout membre ainsi créé. Déploiement par arrêt
complet, à signaler dans le `CHANGELOG.md` et `docs/DEPLOIEMENT.md`.

## 5. Documentation

- `CLAUDE.md` : partie Sécurité (lecture réservée aux membres des projets) et « Règles métier à
  préserver » (visibilité, saisie réservée aux membres, rôles).
- `README.md` : règles d'accès, rôles des membres, endpoints concernés.
- `docs/DEPLOIEMENT.md` : migration V6 et arrêt complet.
- PR `feat(projet)!: réserver les projets et les saisies à leurs membres` (incompatible : un accès
  existant est restreint), fusion en squash après `/review`.

## Tests (cas accepté et cas refusé pour chaque règle)

- `ProjetControllerTest` : un collaborateur ne liste que ses projets ; lit un projet dont il est
  membre ; 403 sur un autre ; l'administrateur voit tout.
- `TacheControllerTest` : liste filtrée sur ses projets, 403 hors de ses projets (liste et lecture).
- `MembreProjetControllerTest` : liste et lecture par un membre ; 403 pour un non-membre ; ajout
  d'un `CONTRIBUTEUR`.
- `ClotureControllerTest` : liste restreinte, 403 hors de ses projets ; clôture refusée à un
  contributeur, acceptée pour un responsable.
- `SaisieTempsControllerTest` : création acceptée pour un membre (chaque rôle), refusée (422) pour
  un non-membre, y compris par l'administrateur pour un autre ; changement de tâche vers un projet
  dont il n'est pas membre refusé ; correction d'une saisie existante après retrait acceptée ;
  contributeur limité à ses saisies, responsable voit celles du projet.
- Migration V6 : un test d'intégration qui prépare des saisies sans membre puis exécute le script
  (ou vérification manuelle sur une copie de la base si le test est trop coûteux).
- `./mvnw verify` vert (couverture du paquet `service`).

## Suite : adaptation du lot F3 (front)

Après la fusion : `npm run api:types` ; rôle « Contributeur » dans le choix des membres (rôle
proposé par défaut) ; texte du dialogue des membres (« Les responsables et suppléants consultent les
saisies… ») ; vérification de bout en bout avec `jdupont` (ne voit que PJT001) ; README du front.

## Points à valider

1. Saisie pour un non-membre refusée en **422** (règle sur les données, comme une ressource
   inactive) plutôt qu'en 403 : d'accord ?
2. Migration V6 (contributeurs ajoutés depuis les saisies existantes) : oui, ou laisser
   l'administrateur déclarer tous les membres à la main ?
3. Libellés : Responsable (`MANAGER`), Suppléant (`BACKUP`), Contributeur (`CONTRIBUTEUR`).
