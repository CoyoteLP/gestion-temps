# gestion-temps

Gestion du temps de travail : une API REST (Spring Boot 4, Java 21) et son front-end web
(Next.js, dans [`web/`](web/), voir « Front-end web »).

- Mise en production et mises à jour : [guide de déploiement](docs/DEPLOIEMENT.md)
- Nouveautés de chaque version : [CHANGELOG](CHANGELOG.md) et
  [releases GitHub](https://github.com/CoyoteLP/gestion-temps/releases)

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
- Santé : http://localhost:8080/actuator/health (métriques et informations : jeton administrateur)

Les tests (`./mvnw test`) utilisent une base MariaDB démarrée automatiquement dans un conteneur
(Testcontainers) : Docker doit être lancé, mais ni MariaDB locale ni `.env` ne sont nécessaires.
`./mvnw verify` vérifie en plus la couverture de tests (rapport : `target/site/jacoco/index.html`).

En production : voir « Exploitation » et le [guide de déploiement](docs/DEPLOIEMENT.md).

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
| /api/utilisateurs        | `actif` (`false` : comptes à valider) ; administrateur seulement |
| /api/taches              | `projetId`                                   |
| /api/saisies-temps       | `utilisateurId`, `projetId`, `tacheId`, `du`, `au` (dates, voir ci-dessous) |
| /api/projets/{projetId}/membres | –                                     |
| /api/clotures            | `projetId`, `mois` (AAAA-MM)                 |

Toutes les listes sont **paginées** : paramètres `page` (à partir de 1, 1 par défaut) et `taille`
(20 par défaut, ramenée à 100 au-delà) ; `data` contient alors la page :

```json
{ "status": "success",
  "data": { "contenu": [ { "id": 1, "code": "PRJ-01" } ], "page": 1, "taille": 20, "total": 1, "pages": 1 },
  "message": null }
```

L'ordre est fixé par l'API (identifiant ; saisies par jour ; clôtures du mois le plus récent au plus
ancien). La recherche des saisies porte sur une période : `du` et `au` ensemble (bornes incluses,
un an au plus, ex. `du=2026-01-01&au=2026-12-31`), ou le mois en cours s'ils sont absents. Une seule
borne, une période inversée ou de plus d'un an renvoie 400.

La description OpenAPI de l'API est publiée sur `/v3/api-docs`, avec l'interface Swagger UI sur
`/swagger-ui.html` (bouton « Authorize » pour y coller un jeton) ; désactivées en production sauf
`OPENAPI_ACTIVE=true`.

Pour saisir des heures : `POST /api/saisies-temps` avec `tacheId` (une tâche du projet),
éventuellement `utilisateurId` (par défaut l'utilisateur connecté), `duree` en heures (de 0,5 à 24, par pas de 0,5 : 1, 1.5, 7.5…), et éventuellement `jour`
et `commentaire`. Sans `jour`, la saisie est
datée d'aujourd'hui ; en modification (`PUT`), un `jour` absent conserve la date existante.

```json
{ "utilisateurId": 1, "tacheId": 3, "duree": 7.5 }
```

Supprimer une ressource encore référencée (projet avec tâches, tâche ou utilisateur avec
saisies) renvoie 409 : il faut alors la désactiver (`actif: false`).

### Compte de l'utilisateur connecté

Chacun gère sa propre fiche, même sans fiche ou avec une fiche inactive :

| Méthode | URL                   | Description |
|---------|-----------------------|-------------|
| GET     | /api/utilisateurs/moi | Sa fiche ; `actif: false` = en attente de validation. 404 s'il n'en a pas encore |
| POST    | /api/utilisateurs/moi | **Inscription** : crée sa fiche à partir du jeton (email vérifié, `given_name`, `family_name`), sans corps. 201 ; 409 si elle existe déjà ; 422 si l'email n'est pas vérifié ou si le nom manque |
| PUT     | /api/utilisateurs/moi | Modifie son nom et son prénom (`{ "nom", "prenom", "version" }`) ; l'email et l'état ne se modifient pas ici |

La fiche créée par l'inscription est **inactive** : un administrateur la valide
(`GET /api/utilisateurs?actif=false`, puis `PUT /api/utilisateurs/{id}` avec `actif: true`).

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

Le jour d'une saisie doit être compris dans la période du projet (`dateDebut` à `dateFin`, bornes
incluses ; une borne absente ne limite pas) : sinon 422. Comme pour les désactivations, la règle ne
s'applique qu'à une saisie nouvelle ou déplacée (autre jour ou autre tâche).

### Clôture mensuelle

Un mois **terminé** peut être clôturé pour un projet (`POST /api/clotures` avec `projetId` et `mois`,
ex. `"2026-10"`) par un administrateur ou un membre du projet (MANAGER, BACKUP). Un administrateur
peut clôturer d'un coup tous les projets actifs qui ne le sont pas encore
(`POST /api/clotures/tous-projets` avec `mois`, 201 avec la liste des clôtures créées). Ensuite, les
saisies de ce mois sur ce projet ne peuvent plus être créées, modifiées, déplacées (vers ou depuis ce
mois) ni supprimées, administrateur compris (422). Seul un administrateur peut rouvrir le mois
(`DELETE /api/clotures/{id}`). Le mois en cours ou à venir ne peut pas être clôturé (422), un mois
déjà clôturé renvoie 409.

## Authentification et droits

Toutes les requêtes (sauf la santé et la documentation, voir « Exploitation ») exigent un jeton d'accès OIDC dans l'en-tête
`Authorization: Bearer <jeton>`, émis par le fournisseur configuré dans `OIDC_ISSUER_URI` (l'API ne
gère aucun mot de passe) et destiné à l'API : sa revendication `aud` doit contenir `OIDC_AUDIENCE`
(ex. `gestion-temps-api`), un jeton émis pour une autre application du même fournisseur est refusé.
Sans jeton valide (signature, émetteur, audience, expiration) : 401.

- **Rôle administrateur** : la revendication des rôles du jeton (`roles` par défaut, configurable
  par `OIDC_ROLES_CLAIM`, ex. `realm_access.roles` pour Keycloak) contient `ADMIN`. L'administrateur
  gère les projets, tâches, utilisateurs et membres, et accède à toutes les saisies.
- **Collaborateur** : tout autre utilisateur authentifié, dont la fiche est **active**. Il lit les
  projets, tâches et membres, et sa propre fiche (`/api/utilisateurs/moi`) ; il crée, modifie et
  supprime **ses** saisies, et consulte en plus celles des projets dont il est membre (filtre
  `projetId` ou `tacheId`). La liste et le détail des utilisateurs, et toute autre écriture : 403.
- **Compte sans fiche active** (inconnu, inscrit en attente de validation, désactivé) : il n'accède
  qu'à sa propre fiche (`/api/utilisateurs/moi`) ; tout le reste renvoie 403, avec un message qui
  en donne la raison. Un administrateur n'a pas besoin de fiche.
- **Membres d'un projet** (`/api/projets/{projetId}/membres`) : un utilisateur avec un rôle de
  projet `MANAGER` ou `BACKUP` (mêmes droits aujourd'hui).
- **Rattachement du compte** : l'administrateur crée l'utilisateur avec son email ; à la première
  connexion, l'API le retrouve par l'email du jeton puis mémorise l'identifiant du compte (`sub`).
  L'email doit être déclaré vérifié par le fournisseur (`email_verified: true`) ; pour un
  fournisseur qui ne transmet pas cette revendication mais garantit les emails (annuaire de
  l'entreprise), `OIDC_EXIGER_EMAIL_VERIFIE=false` accepte son absence.
  Sans fiche, un utilisateur peut aussi s'inscrire lui-même (`POST /api/utilisateurs/moi`, voir
  « Compte de l'utilisateur connecté ») : sa fiche est alors rattachée à son compte dès sa création.

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

**Inscription en dev** : la page de connexion de Keycloak propose « S'inscrire » (le front l'ouvre
directement : voir [Front-end web](#front-end-web)). Le Keycloak de
dev n'a pas de serveur d'emails : après l'inscription, cocher *Email verified* sur le compte dans la
console (*Users*), puis créer la fiche avec le jeton de l'inscrit (`POST /api/utilisateurs/moi`) et
la valider en administrateur (`PUT /api/utilisateurs/{id}` avec `actif: true`).

Les jetons durent 30 minutes. Console d'administration : http://localhost:8180/admin (`admin`,
mot de passe `KEYCLOAK_ADMIN_PASSWORD`, `admin` par défaut). Sous Git Bash (Windows), éviter les
accents dans les corps JSON passés en argument à `curl` (ils ne sont pas envoyés en UTF-8) :
utiliser un fichier (`--data-binary @corps.json`).

## Front-end web

Application Next.js dans `web/` (conventions : [web/CLAUDE.md](web/CLAUDE.md)). Le navigateur ne
parle qu'au serveur Next.js, qui appelle l'API avec le jeton de l'utilisateur (BFF) : les jetons
restent dans un cookie chiffré `httpOnly`, et l'API n'a pas de CORS à ouvrir.

Prérequis : Node.js 22, le Keycloak de développement et l'API lancés (voir plus haut). Le royaume
déclare le client public `gestion-temps-web` (Authorization Code + PKCE) ; après une mise à jour de
`realm-gestion-temps.json`, le réimporter avec
`docker compose -f docker/keycloak/compose.yaml down` puis `up -d`.

```bash
cd web
cp .env.example .env.local      # puis renseigner AUTH_SECRET (voir ci-dessous)
npm install
npm run dev                     # http://localhost:3000
```

`AUTH_SECRET` chiffre le cookie de session : une valeur aléatoire propre à chaque poste, générée par
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Sous PowerShell, si
`npm` est refusé (« l'exécution de scripts est désactivée »), autoriser les scripts locaux une fois :
`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

Sans session, toute page renvoie vers `/connexion` ; un compte de test (`jdupont` / `jdupont`)
doit exister dans l'API pour que la liste des projets s'affiche.

**Inscription depuis le front** : « Créer un compte » sur `/connexion` ouvre le formulaire
d'inscription de Keycloak. À chaque connexion d'un non-administrateur, le serveur Next.js crée sa
fiche (`POST /api/utilisateurs/moi`, inactive) si elle n'existe pas ; un échec ne bloque pas la
connexion. Tant que la fiche n'est pas active, les pages Projets et Saisies affichent à la place
« Inscription à finaliser » (pas de fiche : bouton pour réessayer, qui affiche la raison du refus)
ou « Compte en attente de validation ». En dev :

1. « Créer un compte », remplir le formulaire : retour connecté, « Inscription à finaliser »
   (l'email n'est pas vérifié, faute de serveur d'emails) ;
2. dans la console Keycloak (*Users*), cocher *Email verified*, puis « Finaliser mon inscription » :
   « Compte en attente de validation » ;
3. en administrateur, `PUT /api/utilisateurs/{id}` avec `actif: true` (écran prévu au lot F3), puis
   recharger la page.

La page Profil modifie le nom et le prénom de la fiche ; le mot de passe et l'email se gèrent dans
la console de compte de Keycloak (lien « Gérer mon compte de connexion »).

Vérifications :
`npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build` (lancées
par le workflow « Front web » sur chaque pull request qui modifie `web/`). Sous Windows, lancer
Vitest depuis un chemin en `C:\…` (majuscule), sinon aucun test n'est trouvé.

Les types de l'API (`web/src/lib/api/schema.d.ts`) sont générés depuis l'API de dev en marche :
`npm run api:types`.

## Format des réponses

Toutes les réponses (succès comme erreurs) utilisent la même enveloppe, le code HTTP restant significatif :

```json
{ "status": "success", "data": { "id": 1, "code": "PRJ-01" }, "message": null }
```

```json
{ "status": "error", "data": null, "message": "Projet introuvable (id=9999)" }
```

Chaque ressource renvoyée porte un objet `audit` en lecture seule, renvoyé aux **seuls
administrateurs** (`null` pour les autres, qui n'ont pas à connaître l'email des auteurs) : date et
auteur de la création
et de la dernière modification (instants UTC ; auteur = email du jeton, ou identifiant du compte
à défaut, null pour les données antérieures à l'audit).

```json
"audit": { "creeLe": "2026-11-02T08:30:00Z", "creePar": "jdupont@lirox.test",
           "modifieLe": "2026-11-02T09:10:00Z", "modifiePar": "pmartin@lirox.test" }
```

Une suppression renvoie 200 avec `data: null` et un message de confirmation. Une erreur de
validation (400) liste les champs en cause dans `message`, par exemple
`"Requête invalide : code : ne doit pas être vide ; nom : ne doit pas être vide"`.

Chaque réponse porte un en-tête `X-Correlation-Id` : l'identifiant de la requête, repris dans
toutes ses lignes de log. Un client ou un reverse proxy peut le fournir dans la requête (lettres,
chiffres, `.`, `_`, `-`, 64 caractères au plus ; sinon l'API en génère un). Le communiquer en cas
d'erreur permet de retrouver les logs de l'appel.

## Exploitation

La mise en production est décrite dans le [guide de déploiement](docs/DEPLOIEMENT.md) : base de
données, fournisseur OIDC, variables d'environnement, réseau, supervision, logs, mises à jour.
En bref :

- **Image** : `./mvnw spring-boot:build-image` produit `gestion-temps:<version>` (buildpacks
  Paketo, Java 21), qui démarre en profil `prod`, avec arrêt gracieux (20 s).
- **Ports** : l'API sur 8080 ; en production, Actuator (sondes `/actuator/health/liveness` et
  `/actuator/health/readiness`, `/actuator/prometheus`, `/actuator/info`) sur un port de gestion
  séparé, 8081, sans jeton : à réserver au réseau interne. En dev, Actuator reste sur le port de
  l'API : la santé est publique, le reste exige un jeton administrateur.
- **Logs** : JSON (Elastic Common Schema) en production, avec l'identifiant de corrélation de la
  requête dans le champ `correlationId` ; en dev, lisibles, avec les requêtes SQL d'Hibernate
  (niveau `debug` de `org.hibernate.SQL`).
- **Analyses de sécurité** : Dependabot propose chaque semaine les mises à jour des dépendances
  Maven, npm (`web/`) et des actions GitHub (pull requests vers `develop`) ; CodeQL analyse le
  code Java et TypeScript à chaque
  pull request et chaque semaine (onglet *Security* du dépôt).

## Structure

API (`src/main/java`) :

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

Front-end (`web/src`) : `app/` (pages), `components/` (dont `ui/`, composants shadcn/ui),
`lib/api/` (client de l'API), `lib/auth/` (session et jetons), `auth.ts` et `proxy.ts`
(authentification et protection des pages).
