# Guide de déploiement — gestion-temps

Ce guide décrit la mise en production de l'API et du front-end web (`web/`), et leurs mises à jour.
Le front est la seule partie publiée : il appelle l'API depuis son serveur (BFF), et l'API reste
sur le réseau interne. Le fonctionnement de l'API
(endpoints, droits, format des réponses) est décrit dans le [README](../README.md) ; les
nouveautés de chaque version dans le [CHANGELOG](../CHANGELOG.md).

## 1. Prérequis

| Élément | Exigence |
|---------|----------|
| Exécution | un environnement de conteneurs (Docker, Kubernetes…) ; l'image embarque Java 21 |
| Base de données | **MariaDB 11.4**, une base dédiée |
| Authentification | un fournisseur **OIDC** (Keycloak, Entra ID, Okta…) qui émet des jetons JWT signés |
| Réseau | un reverse proxy HTTPS devant le **front** ; l'API et la supervision sur un réseau interne |
| Construction | JDK 21 (API) et Docker sur le poste ou le serveur qui construit les images ; l'image du front embarque Node.js 22 |

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
4. **Inscription** (facultative) : si le fournisseur laisse les utilisateurs créer leur compte
   (Keycloak : *User registration*), il doit vérifier leur email (Keycloak : *Verify email*, avec un
   serveur SMTP configuré) et transmettre `given_name` et `family_name` (portée `profile`). L'inscrit
   crée sa fiche par `POST /api/utilisateurs/moi` ; elle reste **inactive** jusqu'à sa validation
   par un administrateur (`GET /api/utilisateurs?actif=false`, puis `PUT /api/utilisateurs/{id}`
   avec `actif: true`). D'ici là, il n'accède qu'à sa propre fiche. Le bouton « Créer un compte »
   du front ouvre directement le formulaire d'inscription si le fournisseur prend en charge le
   paramètre standard `prompt=create` (Keycloak 26.1 ou plus récent) ; sinon, il affiche la page de
   connexion, d'où l'on peut encore s'inscrire.
5. **Renouvellement des jetons du front** : laisser **désactivée** la révocation des jetons de
   renouvellement déjà utilisés (Keycloak : *Realm settings* → *Tokens* → *Revoke Refresh Token*
   à *Off*, réglage par défaut). Le front renouvelle le jeton d'accès quand il expire ; deux
   requêtes simultanées d'un même utilisateur peuvent alors présenter le même jeton de
   renouvellement, et la révocation déconnecterait l'utilisateur à la seconde.

6. **Client du front** (Keycloak : client `gestion-temps-web`) : Authorization Code avec PKCE
   (méthode `S256`), client public (ou confidentiel : secret dans `OIDC_CLIENT_SECRET`) ;
   - adresse de retour autorisée : `<APP_URL>/api/auth/callback/keycloak` ;
   - adresse de retour après déconnexion : `<APP_URL>/connexion` ; origine web : `<APP_URL>` ;
   - portées `openid profile email` ; les jetons d'accès émis pour le front portent l'**audience
     de l'API** (`OIDC_AUDIENCE`, point 1), sans quoi l'API les refuse (401).

Un compte authentifié sans fiche active (inconnu, en attente, désactivé) ne lit rien d'autre que
sa propre fiche (403), sauf s'il porte le rôle administrateur.

`OIDC_ISSUER_URI` est l'émetteur exact des jetons (revendication `iss`) ; l'API y lit la
configuration OIDC (`/.well-known/openid-configuration`) et les clés de signature à la première
requête authentifiée : le conteneur doit pouvoir joindre cette adresse.

Le Keycloak de `docker/keycloak` est réservé au développement (mots de passe connus, HTTP).

## 4. Images conteneur

### API

L'image est construite depuis le tag de la version, avec les buildpacks Paketo (aucun Dockerfile) :

```bash
git checkout v1.1.0
./mvnw spring-boot:build-image -DskipTests \
    -Dspring-boot.build-image.imageName=<registre>/gestion-temps:1.1.0
docker push <registre>/gestion-temps:1.1.0
```

L'image démarre en profil `prod` dans le fuseau `Europe/Paris`, sous un utilisateur non root. La
mémoire de la JVM est calculée d'après la limite mémoire du conteneur : prévoir au moins 1 Go.
L'image ne contient ni shell utilitaire ni `curl` : les contrôles de santé se font depuis
l'extérieur du conteneur (§ 7).

### Front

L'image est construite depuis le même tag, avec le `Dockerfile` de `web/` (sortie `standalone` de
Next.js) :

```bash
git checkout v1.1.0
docker build -t <registre>/gestion-temps-web:1.1.0 web
docker push <registre>/gestion-temps-web:1.1.0
```

Aucune variable n'est nécessaire à la construction : la même image sert tous les environnements.
Elle démarre `node server.js` sur le port 3000, sous l'utilisateur `nonroot`, à partir d'une image
distroless (Node.js 22, ni shell ni gestionnaire de paquets) : les contrôles de santé se font
depuis l'extérieur du conteneur (§ 7). Prévoir 256 Mo de mémoire au moins. La CI construit et
démarre cette image sur chaque pull request qui modifie `web/`, sans la publier.

## 5. Variables d'environnement

API (`gestion-temps`) :

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

Front (`gestion-temps-web`) :

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `APP_URL` | oui | adresse publique du front, ex. `https://temps.exemple.fr` : adresse de retour du fournisseur, cookies `Secure`, HSTS. Sans elle, le front refuse les connexions (l'adresse n'est jamais déduite des en-têtes du client) |
| `SESSION_SECRET` | oui | clé de chiffrement du cookie de session, **32 caractères au moins**, la même pour toutes les instances (voir ci-dessous) |
| `OIDC_ISSUER_URI` | oui | émetteur, la même valeur que pour l'API |
| `OIDC_CLIENT_ID` | oui | client du front chez le fournisseur (§ 3, point 6) |
| `OIDC_CLIENT_SECRET` | non | secret du client, s'il est confidentiel |
| `OIDC_ROLES_CLAIM` | non | même valeur que pour l'API (`roles` par défaut) |
| `API_URL` | oui | adresse **interne** de l'API, ex. `http://gestion-temps-api:8080` |

`SESSION_SECRET` se génère par `openssl rand -base64 32`. Le changer déconnecte tous les
utilisateurs (sans autre conséquence) : c'est aussi la façon de fermer toutes les sessions d'un
coup. Le front n'a pas d'autre état : ses instances sont interchangeables.

Les mots de passe sont fournis par le gestionnaire de secrets de la plateforme (secret Kubernetes,
fichier d'environnement protégé…), jamais écrits dans un fichier versionné. Une variable obligatoire
absente arrête le démarrage avec un message qui la nomme.

`DB_POOL_MAX` × nombre d'instances doit rester sous le `max_connections` de MariaDB (151 par
défaut), en gardant une marge pour les migrations et l'administration.

## 6. Réseau

| Port | Contenu | Exposition |
|------|---------|------------|
| 3000 | front (pages, sondes `/api/sante`) | **publié** par le reverse proxy HTTPS, seul point d'entrée |
| 8080 | API (`/api/**`) | **réseau interne uniquement** : joint par le front (`API_URL`) |
| 8081 | Actuator de l'API : santé, métriques, version | **réseau interne uniquement**, sans authentification |

- Seul le front est publié. L'API et son Actuator ne doivent être joignables que du réseau
  interne ; le port 8081 répond sans jeton.
- Le front pose lui-même ses en-têtes de sécurité (CSP à nonce, HSTS, `X-Frame-Options`…) : le
  reverse proxy ne doit pas les remplacer. Il termine le TLS et transmet la requête au port 3000 ;
  l'adresse publique vient de `APP_URL`, pas des en-têtes `X-Forwarded-*`.
- Si l'API doit malgré tout être publiée (autre client que le front), la placer derrière le reverse
  proxy HTTPS : il transmet alors `X-Forwarded-Proto` et `X-Forwarded-Host` ; avec
  `SERVER_FORWARD_HEADERS_STRATEGY=native`, l'en-tête `Location` des réponses 201 contient
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

Sondes du front (port 3000, publiques, sans détail technique dans la réponse) :

| Point | Usage |
|-------|-------|
| `/api/sante` | le serveur du front répond (`{"statut":"UP"}`) ; en échec, le redémarrer |
| `/api/sante/disponibilite` | le front joint l'API et le fournisseur OIDC (2 s au plus chacun) : 200 `UP`, sinon 503 `DOWN` ; en échec, ne plus lui envoyer de requêtes (la cause est dans ses logs) |

Le front démarre en moins d'une seconde.

Exemple Kubernetes :

```yaml
containers:
  - name: gestion-temps
    image: <registre>/gestion-temps:1.1.0
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

Pour le front :

```yaml
containers:
  - name: gestion-temps-web
    image: <registre>/gestion-temps-web:1.1.0
    ports:
      - { name: http, containerPort: 3000 }
    livenessProbe:
      httpGet: { path: /api/sante, port: http }
      periodSeconds: 10
    readinessProbe:
      httpGet: { path: /api/sante/disponibilite, port: http }
      periodSeconds: 10
      timeoutSeconds: 5
    resources:
      limits: { memory: 256Mi }
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

Le front écrit ses messages en texte sur la sortie standard (sans jeton, ni email, ni contenu de
cookie). À surveiller :

| Message | Signification |
|---------|---------------|
| `Front indisponible : …` | la sonde de disponibilité a échoué : l'API ou le fournisseur OIDC ne répond pas |
| `Renouvellement du jeton impossible` | le fournisseur refuse ou ne répond pas : l'utilisateur doit se reconnecter ; anormal s'il est fréquent |
| `Retour de connexion refusé` / `Connexion impossible à démarrer` | connexion en échec côté fournisseur (configuration du client, fournisseur injoignable) |
| `Cookie … illisible (invalid)` | cookie de session altéré ou `SESSION_SECRET` changé ; une rafale peut signaler une tentative d'attaque |

## 9. Premier déploiement

1. Créer la base et les comptes (§ 2), déclarer l'API chez le fournisseur OIDC (§ 3).
2. Construire et publier l'image (§ 4), puis la démarrer avec ses variables (§ 5) : les migrations
   créent le schéma.
3. Vérifier `/actuator/health/readiness` (`UP`) et `/actuator/info` (version attendue), puis, depuis
   le réseau interne, qu'un appel sans jeton à `/api/projets` renvoie 401.
4. Déclarer le client du front chez le fournisseur (§ 3, point 6), construire et publier l'image
   du front (§ 4), la démarrer avec ses variables (§ 5) et ne publier que son port 3000 (§ 6).
5. Vérifier `/api/sante/disponibilite` (`UP`), les en-têtes de sécurité
   (`curl -I https://<APP_URL>/connexion` : `Content-Security-Policy`,
   `Strict-Transport-Security`), puis que `https://<adresse publique>/api/projets` n'atteint pas
   l'API (redirection vers la page de connexion du front).
6. Se connecter au front avec un compte portant le rôle `ADMIN` (il n'a pas à exister dans l'API)
   : valider les comptes inscrits, créer les projets, leurs tâches et leurs membres (ou par l'API :
   `POST /api/utilisateurs`, avec l'email du compte OIDC). Chaque collaborateur est rattaché à sa
   première connexion.

## 10. Mise à jour

1. Lire le [CHANGELOG](../CHANGELOG.md) de la nouvelle version : changements incompatibles,
   nouvelles variables, migrations.
2. **Sauvegarder la base.**
3. Construire l'image du nouveau tag et la déployer. Au démarrage, la première instance applique les
   nouvelles migrations (les autres attendent son verrou), puis toutes vérifient le schéma.
4. Contrôler `/actuator/info` et `/actuator/health/readiness`.
5. Construire l'image du front du même tag et la déployer : sans base ni migration, ses instances se
   remplacent une à une. Les sessions ouvertes sont conservées tant que `SESSION_SECRET` ne change
   pas. Contrôler `/api/sante/disponibilite`.

Les migrations ne sont pas réversibles : revenir à la version précédente après une migration exige
de **restaurer la sauvegarde** de l'étape 2 (les saisies faites entre-temps sont perdues). Une
version sans migration (voir son CHANGELOG) se remplace simplement par l'image précédente.

En mise à jour progressive (plusieurs instances), les anciennes instances tournent un moment sur le
nouveau schéma : le CHANGELOG signale les versions dont les migrations l'interdisent, à déployer
alors avec un arrêt complet.

Versions à déployer **avec un arrêt complet** :

- **1.1.0** (migration `V6`) : les projets et la saisie sont réservés aux membres du projet, avec
  le nouveau rôle `CONTRIBUTEUR`. La migration ajoute comme contributeur chaque utilisateur sur les
  projets où il a déjà des saisies ; une instance 1.0.0 ne sait pas lire ce rôle. Après la mise à
  jour, l'administrateur déclare les autres membres (collaborateurs sans saisie).

## 11. Arrêt

Sur `SIGTERM`, l'API cesse d'accepter des requêtes, laisse 20 s à celles en cours, puis s'arrête.
Le délai de l'orchestrateur avant `SIGKILL` doit être supérieur :

- Kubernetes : 30 s par défaut (`terminationGracePeriodSeconds`), suffisant ;
- Docker : **10 s par défaut**, trop court : le porter à 30 s (`docker run --stop-timeout 30`,
  `stop_grace_period: 30s` avec Docker Compose), sinon les requêtes en cours sont coupées.

Le front, sur `SIGTERM`, cesse d'accepter des connexions et termine les requêtes en cours (quelques
secondes au plus) : les délais par défaut suffisent.

## 12. Contrôle avant mise en service

- [ ] Seul le port 3000 du front est publié (HTTPS) ; ports 8080 et 8081 de l'API inaccessibles
  hors du réseau interne.
- [ ] Front : `APP_URL` en `https`, `SESSION_SECRET` aléatoire (32 caractères au moins) dans le
  gestionnaire de secrets et identique sur toutes les instances.
- [ ] Client du front chez le fournisseur : adresses de retour limitées à `APP_URL`, PKCE `S256`,
  jetons portant l'audience de l'API ; révocation des jetons de renouvellement désactivée (§ 3).
- [ ] En-têtes du front présents (`Content-Security-Policy`, `Strict-Transport-Security`) et non
  remplacés par le reverse proxy.
- [ ] `OPENAPI_ACTIVE` absent ou `false` (sauf documentation publique voulue).
- [ ] Compte de l'application sans droit DDL ; mots de passe dans le gestionnaire de secrets.
- [ ] Jetons du fournisseur : `aud`, rôle `ADMIN` pour les seuls administrateurs, `email_verified`.
- [ ] Inscription ouverte chez le fournisseur : vérification de l'email activée (SMTP configuré).
- [ ] Sauvegardes de la base planifiées et restauration testée.
- [ ] Logs collectés ; alerte sur les `ERROR` ; métriques collectées.
