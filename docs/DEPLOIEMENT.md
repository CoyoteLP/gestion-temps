# Guide de déploiement — gestion-temps

Ce guide décrit la mise en production de l'API et ses mises à jour. Le fonctionnement de l'API
(endpoints, droits, format des réponses) est décrit dans le [README](../README.md) ; les
nouveautés de chaque version dans le [CHANGELOG](../CHANGELOG.md).

## 1. Prérequis

| Élément | Exigence |
|---------|----------|
| Exécution | un environnement de conteneurs (Docker, Kubernetes…) ; l'image embarque Java 21 |
| Base de données | **MariaDB 11.4**, une base dédiée |
| Authentification | un fournisseur **OIDC** (Keycloak, Entra ID, Okta…) qui émet des jetons JWT signés |
| Réseau | un reverse proxy HTTPS devant l'API ; un réseau interne pour la supervision |
| Construction | JDK 21 et Docker sur le poste ou le serveur qui construit l'image |

## 2. Base de données

Créer la base et deux comptes : celui des **migrations**, qui crée et modifie le schéma au
démarrage, et celui de l'**application**, limité aux données. Un seul compte avec tous les droits
fonctionne aussi (laisser alors `FLYWAY_USERNAME` et `FLYWAY_PASSWORD` vides), mais une injection
SQL ou une erreur applicative aurait alors les droits de modifier le schéma.

```sql
CREATE DATABASE gestion_temps CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

-- Compte des migrations (Flyway) : DDL sur la base
CREATE USER 'gestion_temps_migration'@'%' IDENTIFIED BY '<mot de passe>';
GRANT ALL PRIVILEGES ON gestion_temps.* TO 'gestion_temps_migration'@'%';

-- Compte de l'application : données seulement
CREATE USER 'gestion_temps_app'@'%' IDENTIFIED BY '<mot de passe>';
GRANT SELECT, INSERT, UPDATE, DELETE ON gestion_temps.* TO 'gestion_temps_app'@'%';
```

Restreindre `'%'` à l'adresse ou au réseau des conteneurs de l'API. Le schéma n'est jamais créé à
la main : les migrations (`src/main/resources/db/migration`) sont appliquées automatiquement au
démarrage, puis Hibernate vérifie que le schéma correspond au code et refuse de démarrer sinon.

Sauvegardes : planifier `mariadb-dump --single-transaction gestion_temps` (ou l'outil de
sauvegarde de l'hébergeur), et **toujours** sauvegarder avant une mise à jour (voir § 9).

## 3. Fournisseur OIDC

Déclarer l'API auprès du fournisseur :

1. **Audience** : les jetons destinés à l'API portent un identifiant dans la revendication `aud`
   (ex. `gestion-temps-api`) ; c'est la valeur de `OIDC_AUDIENCE`. Un jeton émis pour une autre
   application est refusé (401). Keycloak : *mapper* « Audience » sur le client des applications
   clientes ; Entra ID : l'*Application ID URI* de l'API.
2. **Rôle administrateur** : la valeur `ADMIN` dans une revendication de type liste ou chaîne. Son
   chemin est donné par `OIDC_ROLES_CLAIM` (par défaut `roles` ; Keycloak : `realm_access.roles`
   pour les rôles de royaume). Tout autre utilisateur authentifié est collaborateur.
3. **Email** : les jetons portent `email` et `email_verified: true`. À la première connexion, l'API
   rattache le compte à l'utilisateur créé avec cet email, puis le reconnaît par `sub`. Si le
   fournisseur ne transmet pas `email_verified` mais garantit les emails (annuaire de
   l'entreprise) : `OIDC_EXIGER_EMAIL_VERIFIE=false`.

`OIDC_ISSUER_URI` est l'émetteur exact des jetons (revendication `iss`) ; l'API y lit la
configuration OIDC (`/.well-known/openid-configuration`) et les clés de signature à la première
requête authentifiée : le conteneur doit pouvoir joindre cette adresse.

Le Keycloak de `docker/keycloak` est réservé au développement (mots de passe connus, HTTP).

## 4. Image conteneur

L'image est construite depuis le tag de la version, avec les buildpacks Paketo (aucun Dockerfile) :

```bash
git checkout v1.0.0
./mvnw spring-boot:build-image -DskipTests \
    -Dspring-boot.build-image.imageName=<registre>/gestion-temps:1.0.0
docker push <registre>/gestion-temps:1.0.0
```

L'image démarre en profil `prod` dans le fuseau `Europe/Paris`, sous un utilisateur non root. La
mémoire de la JVM est calculée d'après la limite mémoire du conteneur : prévoir au moins 1 Go.
L'image ne contient ni shell utilitaire ni `curl` : les contrôles de santé se font depuis
l'extérieur du conteneur (§ 7).

## 5. Variables d'environnement

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `DB_URL` | oui | URL JDBC, ex. `jdbc:mariadb://mariadb.interne:3306/gestion_temps` |
| `DB_USERNAME`, `DB_PASSWORD` | oui | compte de l'application |
| `FLYWAY_USERNAME`, `FLYWAY_PASSWORD` | non | compte des migrations (par défaut : celui de l'application) |
| `OIDC_ISSUER_URI` | oui | émetteur des jetons |
| `OIDC_AUDIENCE` | oui | audience attendue dans les jetons |
| `OIDC_ROLES_CLAIM` | non | chemin de la revendication des rôles (`roles` par défaut) |
| `OIDC_EXIGER_EMAIL_VERIFIE` | non | `false` pour accepter un jeton sans `email_verified` (`true` par défaut) |
| `DB_POOL_MAX` | non | connexions simultanées à la base par instance (10 par défaut) |
| `MANAGEMENT_PORT` | non | port d'Actuator (8081 par défaut) |
| `OPENAPI_ACTIVE` | non | `true` pour publier la documentation OpenAPI (désactivée par défaut) |
| `SERVER_FORWARD_HEADERS_STRATEGY` | selon le proxy | `native` derrière un reverse proxy qui transmet `X-Forwarded-Proto` et `X-Forwarded-Host` (voir § 6) |

Les mots de passe sont fournis par le gestionnaire de secrets de la plateforme (secret Kubernetes,
fichier d'environnement protégé…), jamais écrits dans un fichier versionné. Une variable obligatoire
absente arrête le démarrage avec un message qui la nomme.

`DB_POOL_MAX` × nombre d'instances doit rester sous le `max_connections` de MariaDB (151 par
défaut), en gardant une marge pour les migrations et l'administration.

## 6. Réseau

| Port | Contenu | Exposition |
|------|---------|------------|
| 8080 | API (`/api/**`) | derrière le reverse proxy HTTPS uniquement |
| 8081 | Actuator : santé, métriques, version | **réseau interne uniquement**, sans authentification |

- **Le port 8081 ne doit jamais être publié** par le reverse proxy ni hors du réseau interne : il
  répond sans jeton.
- Le reverse proxy termine le TLS et transmet `X-Forwarded-Proto` et `X-Forwarded-Host` ; avec
  `SERVER_FORWARD_HEADERS_STRATEGY=native`, l'en-tête `Location` des réponses 201 contient alors
  l'adresse publique (`https://…`) et non l'adresse interne. Le proxy doit **remplacer** ces
  en-têtes s'ils arrivent du client, pas les compléter.
- Avec `native`, Tomcat ne croit ces en-têtes que s'ils viennent d'un proxy à adresse privée
  (10.x, 172.16-31.x, 192.168.x, 127.x…). Un proxy sur une autre adresse doit être déclaré par
  une expression régulière dans `SERVER_TOMCAT_REMOTEIP_INTERNAL_PROXIES` (ex.
  `203\.0\.113\.10`) ; sinon `Location` reste en `http://` interne.
- Le proxy peut transmettre son propre identifiant de requête dans `X-Correlation-Id` (lettres,
  chiffres, `.`, `_`, `-`, 64 caractères au plus) : il est repris dans les logs de l'API et renvoyé
  au client.

## 7. Santé et supervision

| Point (port 8081) | Usage |
|-------------------|-------|
| `/actuator/health/liveness` | l'application tourne ; en échec, la redémarrer |
| `/actuator/health/readiness` | prête à recevoir du trafic (base joignable) ; en échec, ne plus lui envoyer de requêtes |
| `/actuator/prometheus` | métriques Prometheus |
| `/actuator/info` | version de l'application |

Le démarrage (migrations comprises) prend de 20 à 60 s selon les ressources allouées.

Exemple Kubernetes :

```yaml
containers:
  - name: gestion-temps
    image: <registre>/gestion-temps:1.0.0
    ports:
      - { name: http, containerPort: 8080 }
      - { name: gestion, containerPort: 8081 }
    startupProbe:
      httpGet: { path: /actuator/health/liveness, port: gestion }
      periodSeconds: 5
      failureThreshold: 30          # jusqu'à 150 s pour démarrer
    livenessProbe:
      httpGet: { path: /actuator/health/liveness, port: gestion }
      periodSeconds: 10
    readinessProbe:
      httpGet: { path: /actuator/health/readiness, port: gestion }
      periodSeconds: 5
    resources:
      limits: { memory: 1Gi }
terminationGracePeriodSeconds: 30   # supérieur aux 20 s de l'arrêt gracieux
```

Exemple de collecte Prometheus :

```yaml
scrape_configs:
  - job_name: gestion-temps
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['gestion-temps.interne:8081']
```

Métriques utiles : `http_server_requests_seconds` (durée et code des requêtes, par URL),
`hikaricp_connections_active` et `hikaricp_connections_pending` (saturation du pool de
connexions), `jvm_memory_used_bytes`.

## 8. Logs

Les logs sont écrits sur la sortie standard, une ligne JSON par événement (Elastic Common Schema),
à collecter par l'outil de la plateforme (Elastic, Loki, Datadog…). Champs utiles : `@timestamp`
(UTC), `log.level`, `message`, `correlationId` (identifiant de la requête, aussi renvoyé au client
dans `X-Correlation-Id`), `service.version`.

Les logs ne contiennent ni jeton, ni mot de passe, ni valeur de requête SQL. Événements à surveiller :

| Niveau | Message | Signification |
|--------|---------|---------------|
| `ERROR` | `Erreur inattendue` | erreur 500 : à analyser (trace jointe) |
| `WARN` | `Contrainte de base de données enfreinte` | écritures simultanées en conflit (409) ; anormal s'il est fréquent |
| `WARN` | `Verrou non obtenu dans le délai` | attente de plus de 5 s sur un verrou (409) ; contention ou transaction bloquée |

## 9. Premier déploiement

1. Créer la base et les comptes (§ 2), déclarer l'API chez le fournisseur OIDC (§ 3).
2. Construire et publier l'image (§ 4), puis la démarrer avec ses variables (§ 5) : les migrations
   créent le schéma.
3. Vérifier `/actuator/health/readiness` (`UP`) et `/actuator/info` (version attendue), puis qu'un
   appel sans jeton à `https://<adresse publique>/api/projets` renvoie 401.
4. Avec un compte portant le rôle `ADMIN` (il n'a pas à exister dans l'API) : créer les
   utilisateurs (`POST /api/utilisateurs`, avec l'email de leur compte OIDC), les projets, leurs
   tâches et leurs membres. Chaque collaborateur est rattaché à sa première connexion.

## 10. Mise à jour

1. Lire le [CHANGELOG](../CHANGELOG.md) de la nouvelle version : changements incompatibles,
   nouvelles variables, migrations.
2. **Sauvegarder la base.**
3. Construire l'image du nouveau tag et la déployer. Au démarrage, la première instance applique les
   nouvelles migrations (les autres attendent son verrou), puis toutes vérifient le schéma.
4. Contrôler `/actuator/info` et `/actuator/health/readiness`.

Les migrations ne sont pas réversibles : revenir à la version précédente après une migration exige
de **restaurer la sauvegarde** de l'étape 2 (les saisies faites entre-temps sont perdues). Une
version sans migration (voir son CHANGELOG) se remplace simplement par l'image précédente.

En mise à jour progressive (plusieurs instances), les anciennes instances tournent un moment sur le
nouveau schéma : le CHANGELOG signale les versions dont les migrations l'interdisent, à déployer
alors avec un arrêt complet.

## 11. Arrêt

Sur `SIGTERM`, l'API cesse d'accepter des requêtes, laisse 20 s à celles en cours, puis s'arrête.
Le délai de l'orchestrateur avant `SIGKILL` doit être supérieur :

- Kubernetes : 30 s par défaut (`terminationGracePeriodSeconds`), suffisant ;
- Docker : **10 s par défaut**, trop court : le porter à 30 s (`docker run --stop-timeout 30`,
  `stop_grace_period: 30s` avec Docker Compose), sinon les requêtes en cours sont coupées.

## 12. Contrôle avant mise en service

- [ ] Port 8081 inaccessible hors du réseau interne ; port 8080 seulement derrière le proxy HTTPS.
- [ ] `OPENAPI_ACTIVE` absent ou `false` (sauf documentation publique voulue).
- [ ] Compte de l'application sans droit DDL ; mots de passe dans le gestionnaire de secrets.
- [ ] Jetons du fournisseur : `aud`, rôle `ADMIN` pour les seuls administrateurs, `email_verified`.
- [ ] Sauvegardes de la base planifiées et restauration testée.
- [ ] Logs collectés ; alerte sur les `ERROR` ; métriques collectées.
