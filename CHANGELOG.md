# Historique des versions

Les changements notables de chaque version mise en production. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon le
[versionnement sémantique](https://semver.org/lang/fr/). Chaque version a sa release GitHub, dont
les notes reprennent sa section. Le déploiement et les mises à jour sont décrits dans le
[guide de déploiement](docs/DEPLOIEMENT.md).

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

[1.0.0]: https://github.com/CoyoteLP/gestion-temps/releases/tag/v1.0.0
