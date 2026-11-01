# gestion-temps

API REST de gestion du temps de travail (Spring Boot 4, Java 21).

## Démarrer

Les informations de connexion à la base ne sont pas versionnées. Avant le premier lancement :

```bash
cp .env.example .env            # puis renseigner DB_URL, DB_USERNAME, DB_PASSWORD dans .env
./mvnw spring-boot:run          # profil dev (MariaDB locale)
```

Le profil `dev` lit `.env` à la racine du projet ; ce fichier est ignoré par Git. Une variable
d'environnement du même nom est prioritaire sur `.env`. Pour une base locale, l'URL est
typiquement `jdbc:mariadb://localhost:3306/gestion_temps?createDatabaseIfNotExist=true`.

Si `.env` est absent ou incomplet, l'application refuse de démarrer et indique quoi faire :

```
APPLICATION FAILED TO START

Description:
Fichier .env introuvable (…\gestion-temps\.env) : les informations de connexion à la base de
données ne sont pas renseignées.

Action:
Copier le modèle à la racine du projet (cp .env.example .env), puis renseigner DB_URL,
DB_USERNAME et DB_PASSWORD dans .env. […]
```

En profil `prod`, le même contrôle liste les variables d'environnement manquantes.

Le schéma de la base est créé et mis à jour au démarrage par les migrations Flyway
(`src/main/resources/db/migration`), dans tous les profils. Une base de développement créée avant
leur mise en place (schéma généré par Hibernate, sans table `flyway_schema_history`) doit être
recréée une fois : `DROP DATABASE gestion_temps;` puis relancer l'application (les données de
développement sont perdues).

- API : http://localhost:8080
- Santé : http://localhost:8080/actuator/health

Les tests (`./mvnw test`) utilisent une base MariaDB démarrée automatiquement dans un conteneur
(Testcontainers) : Docker doit être lancé, mais ni MariaDB locale ni `.env` ne sont nécessaires.
`./mvnw verify` vérifie en plus la couverture de tests (rapport : `target/site/jacoco/index.html`).

En production : `SPRING_PROFILES_ACTIVE=prod` avec `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.

## Contribuer

Après le clonage, activer les hooks Git du projet (une seule fois par poste) :

```bash
git config core.hooksPath .githooks
```

- Branches selon Git Flow : `main` (production), `develop` (intégration, branche par défaut),
  puis `feature/*`, `bugfix/*`, `chore/*`, `release/*`, `hotfix/*`. Toute modification de `main`
  ou `develop` passe par une pull request (protégées sur GitHub).
- Messages de commit au format Conventional Commits, en français :
  `feat(saisie): rendre la date facultative`.
- Fichiers en UTF-8 avec fins de ligne LF (voir `.editorconfig`).
- Chaque pull request est validée par l'intégration continue (GitHub Actions).

Le détail des conventions est dans [CLAUDE.md](CLAUDE.md#git).

## Endpoints

| Méthode | URL                 | Description            |
|---------|---------------------|------------------------|
| GET     | /api/projets        | Liste des projets      |
| GET     | /api/projets/{id}   | Détail d'un projet     |
| POST    | /api/projets        | Création (201)         |
| PUT     | /api/projets/{id}   | Modification           |
| DELETE  | /api/projets/{id}   | Suppression            |

Les ressources `utilisateurs`, `taches` et `saisies-temps` exposent les mêmes opérations CRUD :

| Ressource                | Filtres (GET liste)                          |
|--------------------------|----------------------------------------------|
| /api/utilisateurs        | –                                            |
| /api/taches              | `projetId`                                   |
| /api/saisies-temps       | `utilisateurId`, `tacheId`, `du`, `au` (dates) |

Pour saisir des heures : `POST /api/saisies-temps` avec `utilisateurId`, `tacheId` (une tâche du
projet), `duree` en heures (de 0,5 à 24, par pas de 0,5 : 1, 1.5, 7.5…), et éventuellement `jour`
et `commentaire`. Sans `jour`, la saisie est
datée d'aujourd'hui ; en modification (`PUT`), un `jour` absent conserve la date existante.

```json
{ "utilisateurId": 1, "tacheId": 3, "duree": 7.5 }
```

Supprimer une ressource encore référencée (projet avec tâches, tâche ou utilisateur avec
saisies) renvoie 409 : il faut alors la désactiver (`actif: false`).

Le total des saisies d'un utilisateur sur une même journée ne peut pas dépasser 24 h :
une création ou modification qui le dépasserait renvoie 422. De même, saisir du temps pour
un utilisateur désactivé, sur une tâche désactivée ou sur une tâche d'un projet désactivé
renvoie 422. Ce contrôle ne s'applique qu'à la création ou au changement d'utilisateur/de
tâche : une saisie existante reste corrigeable (durée, jour, commentaire) après une désactivation.

## Format des réponses

Toutes les réponses (succès comme erreurs) utilisent la même enveloppe, le code HTTP restant significatif :

```json
{ "status": "success", "data": { "id": 1, "code": "PRJ-01" }, "message": null }
```

```json
{ "status": "error", "data": null, "message": "Projet introuvable (id=9999)" }
```

Une suppression renvoie 200 avec `data: null` et un message de confirmation. Une erreur de
validation (400) liste les champs en cause dans `message`, par exemple
`"Requête invalide : code : ne doit pas être vide ; nom : ne doit pas être vide"`.

## Structure

```
com.lirox.gestiontemps
├── config       configuration technique
├── controller   endpoints REST
├── service      logique métier
├── repository   Spring Data JPA
├── domain       entités JPA
├── dto          objets d'entrée/sortie
└── exception    exceptions + handler global
```
