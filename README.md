# gestion-temps

API REST de gestion du temps de travail (Spring Boot 4, Java 21).

## Démarrer

Les informations de connexion à la base ne sont pas versionnées. Avant le premier lancement :

```bash
cp .env.example .env            # puis renseigner DB_*, OIDC_ISSUER_URI et OIDC_AUDIENCE
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

En production : `SPRING_PROFILES_ACTIVE=prod` avec `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`,
`OIDC_ISSUER_URI` et `OIDC_AUDIENCE` (voir « Authentification et droits »).

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
| /api/saisies-temps       | `utilisateurId`, `projetId`, `tacheId`, `du`, `au` (dates) |
| /api/projets/{projetId}/membres | –                                     |

Pour saisir des heures : `POST /api/saisies-temps` avec `tacheId` (une tâche du projet),
éventuellement `utilisateurId` (par défaut l'utilisateur connecté), `duree` en heures (de 0,5 à 24, par pas de 0,5 : 1, 1.5, 7.5…), et éventuellement `jour`
et `commentaire`. Sans `jour`, la saisie est
datée d'aujourd'hui ; en modification (`PUT`), un `jour` absent conserve la date existante.

```json
{ "utilisateurId": 1, "tacheId": 3, "duree": 7.5 }
```

Supprimer une ressource encore référencée (projet avec tâches, tâche ou utilisateur avec
saisies) renvoie 409 : il faut alors la désactiver (`actif: false`).

### Modification et accès concurrents

Chaque ressource renvoyée porte un champ `version`. Une modification (`PUT`) doit renvoyer la
`version` lue : sans elle, la requête est refusée (400) ; si la ressource a été modifiée entre-temps
par quelqu'un d'autre, elle est refusée (409) et il faut la recharger avant de réessayer. En
création (`POST`), `version` est ignorée.

```json
PUT /api/saisies-temps/12
{ "version": 0, "utilisateurId": 1, "tacheId": 3, "duree": 7 }
```

La réponse renvoie la nouvelle `version` (ici 1).

Les saisies d'un même utilisateur sont enregistrées l'une après l'autre, pour que le total de 24 h
par jour soit respecté même en cas de requêtes simultanées. Si une saisie attend plus de 5 secondes
qu'une autre se termine, elle est refusée (409) et peut être renvoyée. La date du jour (saisie sans `jour`) est celle
de Paris (Europe/Paris), quel que soit le fuseau du serveur.

Le total des saisies d'un utilisateur sur une même journée ne peut pas dépasser 24 h :
une création ou modification qui le dépasserait renvoie 422. De même, saisir du temps pour
un utilisateur désactivé, sur une tâche désactivée ou sur une tâche d'un projet désactivé
renvoie 422. Ce contrôle ne s'applique qu'à la création ou au changement d'utilisateur/de
tâche : une saisie existante reste corrigeable (durée, jour, commentaire) après une désactivation.

## Authentification et droits

Toutes les requêtes (sauf `/actuator/health`) exigent un jeton d'accès OIDC dans l'en-tête
`Authorization: Bearer <jeton>`, émis par le fournisseur configuré dans `OIDC_ISSUER_URI` (l'API ne
gère aucun mot de passe) et destiné à l'API : sa revendication `aud` doit contenir `OIDC_AUDIENCE`
(ex. `gestion-temps-api`), un jeton émis pour une autre application du même fournisseur est refusé.
Sans jeton valide (signature, émetteur, audience, expiration) : 401.

- **Rôle administrateur** : la revendication des rôles du jeton (`roles` par défaut, configurable
  par `OIDC_ROLES_CLAIM`, ex. `realm_access.roles` pour Keycloak) contient `ADMIN`. L'administrateur
  gère les projets, tâches, utilisateurs et membres, et accède à toutes les saisies.
- **Collaborateur** : tout autre utilisateur authentifié. Il lit les projets, tâches, utilisateurs
  et membres ; il crée, modifie et supprime **ses** saisies, et consulte en plus celles des projets
  dont il est membre (filtre `projetId` ou `tacheId`). Toute autre écriture : 403.
- **Membres d'un projet** (`/api/projets/{projetId}/membres`) : un utilisateur avec un rôle de
  projet `MANAGER` ou `BACKUP` (mêmes droits aujourd'hui).
- **Rattachement du compte** : l'administrateur crée l'utilisateur avec son email ; à la première
  connexion, l'API le retrouve par l'email du jeton puis mémorise l'identifiant du compte (`sub`).
  L'email doit être déclaré vérifié par le fournisseur (`email_verified: true`) ; pour un
  fournisseur qui ne transmet pas cette revendication mais garantit les emails (annuaire de
  l'entreprise), `OIDC_EXIGER_EMAIL_VERIFIE=false` accepte son absence.
  Un compte sans utilisateur correspondant, ou un utilisateur désactivé, reçoit 403 sur les saisies.

### Keycloak de développement

Un fournisseur OIDC local est fourni pour appeler l'API avec de vrais jetons
(`docker/keycloak/`, jamais en production) :

```bash
docker compose -f docker/keycloak/compose.yaml up -d   # Keycloak sur http://localhost:8180 (≈ 30 s)
```

Dans `.env` : `OIDC_ISSUER_URI=http://localhost:8180/realms/gestion-temps` et
`OIDC_AUDIENCE=gestion-temps-api` (le royaume place l'audience et les rôles dans le jeton). Comptes de test du royaume
`gestion-temps`, mot de passe identique à l'identifiant :

| Compte    | Email                | Rôle                                      |
|-----------|----------------------|-------------------------------------------|
| `admin`   | `admin@lirox.test`   | `ADMIN`                                   |
| `jdupont` | `jdupont@lirox.test` | collaborateur                             |
| `pmartin` | `pmartin@lirox.test` | collaborateur (à ajouter comme membre d'un projet) |

L'administrateur n'a pas besoin d'exister dans l'API ; les collaborateurs doivent y être créés avec
le même email pour que leur compte soit rattaché :

```bash
ADMIN=$(./docker/keycloak/jeton.sh admin)
curl -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
     -d '{"email":"jdupont@lirox.test","nom":"Dupont","prenom":"Jean"}' http://localhost:8080/api/utilisateurs
JDUPONT=$(./docker/keycloak/jeton.sh jdupont)
curl -H "Authorization: Bearer $JDUPONT" http://localhost:8080/api/saisies-temps
```

Les jetons durent 30 minutes. Console d'administration : http://localhost:8180/admin (`admin`,
mot de passe `KEYCLOAK_ADMIN_PASSWORD`, `admin` par défaut). Sous Git Bash (Windows), éviter les
accents dans les corps JSON passés en argument à `curl` (ils ne sont pas envoyés en UTF-8) :
utiliser un fichier (`--data-binary @corps.json`).

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
