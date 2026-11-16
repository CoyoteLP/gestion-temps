# Historique des versions

Les changements notables de chaque version mise en production. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon le
[versionnement sémantique](https://semver.org/lang/fr/). Chaque version a sa release GitHub, dont
les notes reprennent sa section. Le déploiement et les mises à jour sont décrits dans le
[guide de déploiement](docs/DEPLOIEMENT.md).

## [1.1.0] - 2026-11-16

Arrivée du front-end web (`web/`) et règles d'accès par projet. **Version à déployer avec un
arrêt complet** de l'API (migration `V6`, voir « Mise à jour ») ; l'API devient interne, seul le
front est publié.

### ⚠️ Changements incompatibles (API)

- **Projets réservés à leurs membres** : un collaborateur (non administrateur) ne voit plus que
  les projets dont il est membre, avec leurs tâches, membres et clôtures (403 « Vous n'êtes pas
  membre de ce projet » sur un autre) ; il ne saisit du temps que sur ces projets. L'utilisateur
  d'une saisie nouvelle ou réaffectée doit être membre du projet, administrateur compris (422) ;
  une saisie existante reste corrigeable après le retrait de son auteur.
- **Nouveau rôle de membre `CONTRIBUTEUR`** : voit le projet et y saisit son temps. Consulter les
  saisies des autres membres et clôturer un mois sont désormais réservés à `MANAGER` (responsable)
  et `BACKUP` (suppléant).
- **Compte actif obligatoire** : un compte authentifié sans fiche active (inconnu, inscrit en
  attente de validation, désactivé) reçoit 403 sur toute l'API, sauf `/api/utilisateurs/moi` ;
  auparavant, tout authentifié lisait le référentiel.
- `GET /api/utilisateurs` et `GET /api/utilisateurs/{id}` réservés à l'administrateur ; `audit`
  vaut `null` pour les autres.

### Fonctionnalités

- **Front-end web** (Next.js, `web/`), qui appelle l'API depuis son serveur (BFF) :
  - connexion et inscription chez le fournisseur OIDC (Authorization Code + PKCE), session
    chiffrée côté serveur, jetons jamais exposés au navigateur ;
  - **Saisies** : la semaine de l'utilisateur (grille, liste, dialogue de saisie), avertissement
    au-delà de 8 h dans la journée, recopie de la semaine précédente ou du lundi ;
  - **Équipe** : récapitulatif du mois par membre et par tâche, détail filtrable, clôture et
    réouverture ; pour l'administrateur, synthèse du mois de tous les projets (statut, total,
    total général, clôture de tous les projets ouverts) ;
  - **Projets** : tâches, membres et rôles, mois clôturés ; listes triées et filtrées par l'API ;
  - **Utilisateurs** (administrateur) : validation des inscriptions, activation, réinitialisation
    du rattachement d'un compte ;
  - **Profil** : nom et prénom, lien vers la console de compte du fournisseur ;
  - messages colorés selon leur niveau (information, avertissement, erreur).
- **Inscription** : `POST /api/utilisateurs/moi` crée la fiche de l'utilisateur connecté (email
  vérifié), **inactive** jusqu'à sa validation par un administrateur ; `GET` et `PUT` sur
  `/api/utilisateurs/moi` (consultation, nom et prénom).
- `DELETE /api/utilisateurs/{id}/rattachement` (administrateur) : détache une fiche de son compte
  de connexion (compte recréé chez le fournisseur) ; `UtilisateurResponse.rattache`.
- `ProjetResponse.monRole` : rôle de l'appelant dans le projet ; les membres d'un projet sont
  renvoyés avec le nom et le prénom de l'utilisateur.
- **Tri et filtres** des listes par l'API (`tri`, `sens` parmi les colonnes admises de chaque
  ressource, 400 sinon ; filtres texte « contient », sans tenir compte de la casse ni des accents).
- `GET /api/projets/synthese?mois=` (administrateur) : total des heures et clôture du mois par
  projet, filtres `projet` et `cloture`, total général.

### Mise à jour

- **Migration `V6`** (données seulement) : chaque utilisateur devient contributeur des projets où
  il a déjà des saisies, pour garder l'accès des utilisateurs en place. Une instance 1.0.0 ne sait
  pas lire le rôle `CONTRIBUTEUR` : **arrêter toutes les instances de l'API** avant de démarrer la
  1.1.0 (pas de mise à jour progressive). Après la mise à jour, l'administrateur déclare les autres
  membres des projets.
- **Nouveau composant à déployer : le front** (`web/Dockerfile`, image distroless Node 22, sondes
  `/api/sante` et `/api/sante/disponibilite`), avec un client OIDC dédié chez le fournisseur.
- **Nouvelles variables d'environnement, front seulement** : `APP_URL` et `SESSION_SECRET`
  (obligatoires), `OIDC_ISSUER_URI`, `OIDC_CLIENT_ID`, `API_URL` (obligatoires),
  `OIDC_CLIENT_SECRET` et `OIDC_ROLES_CLAIM` (facultatives). Aucune nouvelle variable pour l'API.
- **Réseau** : seul le front est publié par le reverse proxy HTTPS ; l'API (8080) et son Actuator
  (8081) restent sur le réseau interne. Voir le [guide de déploiement](docs/DEPLOIEMENT.md).
- Fournisseur OIDC : laisser désactivée la révocation des jetons de renouvellement déjà utilisés.

### Sécurité

- Front : politique de sécurité du contenu à nonce par requête (aucun script injecté ne
  s'exécute), HSTS en HTTPS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `X-Content-Type-Options`, `Cross-Origin-Opener-Policy` ; adresse publique (`APP_URL`) jamais
  déduite des en-têtes du client.

### Qualité

- API : 400 tests automatisés sur MariaDB 11.4 (Testcontainers), couverture des services d'au
  moins 90 %.
- Front : 647 tests unitaires (Vitest) et 12 tests de bout en bout (Playwright) contre la pile
  complète (MariaDB, Keycloak, API, front), lancés par la CI sur les pull requests concernées.

## [1.0.0] - 2026-11-08

Première version de production de l'API de gestion du temps de travail.

### Fonctionnalités

- **Référentiel** : projets (code unique, période `dateDebut`–`dateFin`), tâches rattachées à un
  projet, utilisateurs (email unique) et membres de projet (`MANAGER` ou `BACKUP`). Une ressource
  encore référencée ne se supprime pas, elle se désactive (`actif: false`).
- **Saisies de temps** :
  - de 0,5 h à 24 h par pas de 0,5 h, 24 h au plus par utilisateur et par jour ;
  - jour compris dans la période du projet, datée du jour (heure de Paris) si `jour` est absent ;
  - aucune nouvelle saisie sur un utilisateur, une tâche ou un projet désactivé.
- **Clôture mensuelle** par projet, ou, pour un administrateur, de tous les projets actifs d'un
  mois en une requête. Un mois terminé se clôture par un administrateur ou un membre du projet ;
  il interdit ensuite toute écriture de ses saisies, et seul un administrateur le rouvre.
- **Authentification OIDC** (jetons JWT : signature, émetteur, audience, expiration vérifiés).
  Le rôle `ADMIN` gère le référentiel et toutes les saisies. Un collaborateur gère ses saisies et
  consulte celles des projets dont il est membre ; tout utilisateur authentifié lit le référentiel.
  Le compte est rattaché à l'utilisateur par son email vérifié à la première connexion.
- **Audit** : date et auteur de la création et de la dernière modification de chaque ressource.
- **Modifications concurrentes** : `version` obligatoire en modification (409 si la ressource a
  changé entre-temps) ; écritures simultanées sérialisées, sans dépassement des 24 h ni saisie
  pendant une clôture.
- **Listes paginées** (`page`, `taille`, 100 au plus) ; recherche des saisies sur une période d'un
  an au plus, le mois en cours par défaut.
- Réponses dans une enveloppe unique `{ status, data, message }`, messages d'erreur en français.
- Documentation OpenAPI et Swagger UI (désactivées par défaut en production).

### Exploitation

- Schéma créé et mis à jour par les migrations Flyway au démarrage (V1 à V5), compte de
  migration distinct facultatif.
- Sondes de vie et de disponibilité, métriques Prometheus et version sur un port de gestion
  séparé (8081).
- Logs JSON (Elastic Common Schema) avec identifiant de corrélation par requête
  (`X-Correlation-Id`).
- Image conteneur par buildpacks, arrêt gracieux.

### Qualité

- 305 tests automatisés sur MariaDB 11.4 (Testcontainers), dont les accès concurrents et la
  configuration de production ; couverture des services d'au moins 90 %.
- Intégration continue, analyse CodeQL et mises à jour des dépendances par Dependabot.

[1.1.0]: https://github.com/CoyoteLP/gestion-temps/releases/tag/v1.1.0
[1.0.0]: https://github.com/CoyoteLP/gestion-temps/releases/tag/v1.0.0
