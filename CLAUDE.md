# CLAUDE.md

Conventions de l'équipe pour le projet **gestion-temps** : gestion du temps de travail, avec une
API REST (Spring Boot 4, Java 21, JPA, MariaDB) et un front-end web (Next.js). Ce fichier est
versionné ; les préférences personnelles vont dans `CLAUDE.local.md` (non versionné).

> La partie « Backend (API Java) » ne s'applique pas sous `web/`, qui a ses propres conventions
> dans [`web/CLAUDE.md`](web/CLAUDE.md). La partie « Commun » s'applique partout.

# Commun

## Dépôt

Monorepo, un seul Git Flow et une seule version pour les deux applications :

- racine : l'API Java (`pom.xml`, `src/`) ;
- `web/` : le front-end Next.js, qui appelle l'API depuis son serveur (BFF) ;
- `docker/` : environnement de dev (Keycloak) ; `docs/` : déploiement et plans.

Skills du projet :
- backend (`.claude/skills/`) : `/review [périmètre]` (revue des modifications : conventions de ce
  fichier, sécurité, performance, sans rien modifier) et `/test [cible]` (écrit ou complète les
  tests d'une cible puis les lance ; sans argument, lance toute la suite et diagnostique les échecs) ;
- front-end (`web/.claude/skills/`) : `web:review` et `web:test`, mêmes rôles pour `web/`.

## Git

- Ne pas committer ni pousser sans demande explicite.
- Mettre à jour le `README.md` (endpoints, règles, format) quand l'API change, ou le démarrage du front.

### Branches (Git Flow)

| Branche     | Créée depuis | Fusionnée dans          | Rôle                                         |
|-------------|--------------|-------------------------|----------------------------------------------|
| `main`      | —            | —                       | production ; chaque commit est une version taguée |
| `develop`   | `main`       | —                       | intégration de la prochaine version          |
| `feature/*` | `develop`    | `develop`               | une fonctionnalité                           |
| `bugfix/*`  | `develop`    | `develop`               | correction avant mise en production          |
| `chore/*`   | `develop`    | `develop`               | maintenance : version, dépendances, configuration |
| `release/*` | `develop`    | `main` **et** `develop` | préparation d'une version (pas de nouveauté) |
| `hotfix/*`  | `main`       | `main` **et** `develop` | correctif urgent en production               |

- Nommage : `type/numero-description-courte` en minuscules et tirets
  (`feature/12-saisie-sans-date`, `chore/version-0.2.0`, `release/1.0.0`, `hotfix/1.0.1-total-journalier`).
- **Toute** modification de `main` ou `develop` passe par une pull request : GitHub l'impose à
  tous, administrateurs compris (CI « Build et tests » verte et branche à jour), et le hook
  `commit-msg` refuse localement les commits directs sur ces branches.
- `feature/*`, `bugfix/*`, `chore/*` → `develop` : pull request fusionnée en **squash**, après
  `/review`. Le titre de la pull request devient le message du commit : il suit donc le format
  Conventional Commits.
- `release/*` et `hotfix/*` → `main` : pull request fusionnée en **merge commit** (équivalent
  `--no-ff`), puis tag `vX.Y.Z` sur `main` ; reporter ensuite la même branche dans `develop` par
  une pull request en merge commit (pas de squash, pour garder l'historique commun).
- Les branches de travail sont supprimées automatiquement après fusion.
- Branche par défaut sur GitHub : `develop` (cible par défaut des pull requests).

### Messages de commit

Conventional Commits, description **en français**, première ligne ≤ 100 caractères
(vérifié par le hook `commit-msg`) :

```
type(portée): description à l'infinitif
```

Types : `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `style`, `chore`, `build`, `ci`, `revert`.
Portée facultative, en minuscules : `saisie`, `projet`, `tache`, `utilisateur`, `config`…, et `web`
pour tout changement du front-end (`feat(web): …`).
Changement incompatible de l'API : `!` après le type (`feat(api)!: …`).

### Versions

- Versionnement sémantique `MAJEUR.MINEUR.CORRECTIF`, identique dans `pom.xml`, dans
  `web/package.json` et dans le tag Git (`v0.1.0`) ; pas de suffixe `-SNAPSHOT`.
- Changement de version sur `develop` : branche `chore/version-X.Y.Z` qui ne modifie que
  `pom.xml` et `web/package.json` (avec `web/package-lock.json`), pull request intitulée
  `chore(release): version X.Y.Z`, fusion en squash.
- Chaque version passe par une `release/X.Y.Z` qui la fige (version du `pom.xml` et de
  `web/package.json`, `CHANGELOG.md`, documentation ; aucune nouveauté), est fusionnée dans `main`
  avec le tag `vX.Y.Z`, puis `develop`
  passe à la version mineure suivante (branche `chore/version-…`) ; un `hotfix/*` augmente le
  correctif (`1.0.0` → `1.0.1`) et suit le même circuit.
- **Chaque passage en production** (`release/*` ou `hotfix/*` fusionnée dans `main`) : section
  `## [X.Y.Z] - AAAA-MM-JJ` ajoutée dans `CHANGELOG.md` sur la branche de release, puis **release
  GitHub** `vX.Y.Z` sur le tag, dont les notes reprennent cette section. Le CHANGELOG signale les
  changements incompatibles, les nouvelles variables d'environnement et les migrations (avec leur
  compatibilité en mise à jour progressive, voir `docs/DEPLOIEMENT.md`).
- Le guide de déploiement (`docs/DEPLOIEMENT.md`) est mis à jour dans la PR qui change le
  déploiement (variable, port, prérequis, procédure).

### Qualité

- Fichiers en UTF-8, fins de ligne LF uniquement (`.gitattributes`, `.editorconfig`).
- Hooks versionnés dans `.githooks/`, à activer une fois par poste : `git config core.hooksPath .githooks`.
- L'intégration continue (`.github/workflows/ci.yml`) lance `./mvnw verify` sur chaque pull
  request vers `main` et `develop` ; les tests ne sont pas relancés avant chaque push local.
- Le workflow « Front web » (`.github/workflows/web.yml`) vérifie `web/` (lint, format, types, tests,
  build) quand une pull request le modifie ; « Build et tests » reste la seule vérification obligatoire.

# Backend (API Java)

## Commandes

```bash
./mvnw test                                         # tous les tests (MariaDB via Testcontainers : Docker lancé)
./mvnw test -Dtest=SaisieTempsControllerTest        # une classe de test
./mvnw spring-boot:run                              # profil dev (MariaDB locale)
docker compose -f docker/keycloak/compose.yaml up -d  # Keycloak de dev (jetons : docker/keycloak/jeton.sh)
./mvnw spring-boot:build-image                      # image conteneur (buildpacks), profil prod par défaut
```

Lancer `./mvnw test` après toute modification et avant de déclarer une tâche terminée.

## Architecture

Architecture en 3 couches **Controller → Service → Repository**, chacune avec une seule responsabilité :

- **Controller** : réception des requêtes, validation des entrées, mise en forme des réponses.
  Aucune logique métier, aucun appel direct à un repository.
- **Service** : logique métier et règles de gestion.
- **Repository** : accès aux données.

Paquets sous `com.lirox.gestiontemps` :

- `controller` : endpoints REST
- `service` : logique métier
- `repository` : interfaces Spring Data JPA
- `domain` : entités JPA
- `dto` : records `XxxRequest` (entrée, validée) et `XxxResponse` (sortie), plus `ApiResponse`
- `exception` : `ApplicationException` et ses sous-classes, `GlobalExceptionHandler`
- `common` : éléments transverses, dont la classe `Constantes`
- `validation` : contraintes Bean Validation propres au projet (ex. `@PasDe`)
- `config` : configuration technique

DTO et entités sont séparés : **une entité n'est jamais exposée dans une réponse**.

Pour une nouvelle ressource, reproduire la structure de `Projet` (entité → repository → DTO →
service → contrôleur → test) plutôt que d'inventer un autre modèle.

## Conventions de code

### Langue et nommage
- Le **vocabulaire métier est en français** : classes, champs, méthodes, messages, noms de tests
  (`Utilisateur`, `dateDebut`, `getProjet`, `createRefuseUnCodeEnDouble`).
- Le vocabulaire technique Spring/Java reste en anglais (`findById`, `create`, `update`, `delete`,
  `Repository`, `Service`, `Request`, `Response`).
- Variables et méthodes en **lowerCamelCase**
  - Bon : `utilisateurId`, `findByProjetId()`, `isActif()`
  - Mauvais : `utilisateur_id`, `UtilisateurID`, `find_by_projet_id()`
- Classes en **UpperCamelCase**
  - Bon : `UtilisateurService`, `SaisieTempsRepository`
  - Mauvais : `utilisateurService`, `saisie_temps_repository`
- Constantes en **UPPER_SNAKE_CASE**
  - Bon : `MAX_HEURES_JOUR`, `DUREE_MAX_COMMENTAIRE`
  - Mauvais : `maxHeuresJour`, `max_heures_jour`
- Tables en snake_case au singulier (`saisie_temps`), URL en kebab-case au pluriel (`/api/saisies-temps`).
- Indentation par **tabulations**.

### Javadoc
- Javadoc obligatoire sur les **classes et méthodes publiques** du code nouveau ou modifié : rôle,
  `@param`, `@return`, et `@throws` pour les exceptions métier levées.
- Le code existant non modifié n'a pas à être complété d'office.
- Les méthodes privées ne sont commentées que si leur intention n'est pas évidente.

### Constantes
- Pas de nombre magique en dur : toute valeur significative (limite, seuil, valeur par défaut) est
  déclarée dans la classe centrale `common.Constantes` (ex. `Constantes.MAX_HEURES_JOUR`).
- Exception : les tailles de colonnes et de champs dans les annotations JPA et de validation
  (`@Column(length = 100)`, `@Size(max = 100)`) restent écrites dans l'annotation.
- Une constante de `Constantes` peut servir dans une annotation : `@Max(Constantes.MAX_HEURES_JOUR)`.

### Entités (`domain`)
- Lombok `@Getter @Setter @NoArgsConstructor` ; jamais `@Data` sur une entité.
- `@Table(name = "...")` explicite, contraintes de colonne (`nullable`, `length`, `unique`) déclarées.
- Relations `@ManyToOne(fetch = FetchType.LAZY, optional = false)` avec `@JoinColumn` explicite.
- Durées en `BigDecimal` (heures), dates en `LocalDate`.
- Toute entité hérite d'`EntiteAuditee` (colonnes `cree_le`, `cree_par`, `modifie_le`,
  `modifie_par`, remplies par Spring Data via `AuditConfig`, à inclure dans le script Flyway de la
  table) ; horodatages d'audit en `Instant` (UTC), jamais renseignés par le code applicatif.
- Éviter les mots réservés SQL comme noms de colonne (`date`, `user`…) : préférer `jour`, `utilisateur`.

### Repositories
- Une recherche qui renvoie **une seule entité** renvoie un `Optional`
  - Bon : `Optional<Utilisateur> findByEmail(String email)`
  - Mauvais : `Utilisateur findByEmail(String email)` (peut renvoyer null)
- Les listes, booléens et agrégats gardent leur type naturel : `List<Tache> findByProjetId(Long projetId)`,
  `boolean existsByCode(String code)`, `BigDecimal totalJournee(...)`.
- Préférer les méthodes dérivées de Spring Data (`findBy…`, `existsBy…`). Quand elles ne suffisent
  pas, une requête **JPQL** dans un `@Query` du repository est autorisée, avec des paramètres nommés
  (voir `SaisieTempsRepository.search`).
- **Interdits** : SQL natif (`nativeQuery = true`), requêtes construites par concaténation de chaînes,
  requêtes écrites ailleurs que dans un repository.

### DTO
- Des **records**.
- Validation Bean Validation sur le `Request` (`@NotBlank`, `@Size`, `@NotNull`…) ; les règles
  inter-champs simples en méthode `@AssertTrue` (voir `ProjetRequest.isPeriodeValide`).
- Une règle sur un seul champ sans contrainte standard devient une annotation réutilisable dans
  `validation` (voir `@PasDe`), pour que l'erreur soit rattachée au bon champ.
- Messages de contrainte en français, explicites dans l'annotation quand ils sont visibles par
  l'utilisateur (`@DecimalMin(value = ..., message = "doit être d'au moins {value} h")`).
- Le `Response` expose une fabrique `static from(Entite)` ; les relations sont exposées par leur id
  (`projetId`, `tacheId`) ; le dernier composant est `AuditResponse audit` (`AuditResponse.from(entite)`),
  renvoyé aux seuls administrateurs (`null` pour les autres, à la sérialisation : `AuditReserveConfig`).
- Un champ booléen optionnel en entrée est un `Boolean` (null = valeur par défaut).
- Verrouillage optimiste : chaque entité a un `@Version Long version` (colonne `version`), exposé
  dans le `Response`. Le `Request` porte un `Long version` annoté
  `@NotNull(groups = Modification.class, message = "est obligatoire en modification")` : obligatoire
  en `PUT`, ignoré en création.

### Services
- `@Service @RequiredArgsConstructor @Transactional(readOnly = true)` sur la classe,
  `@Transactional` sur les méthodes d'écriture.
- Une méthode privée `apply(request, entite)` partagée par `create` et `update`.
- Les règles métier vivent ici, pas dans les contrôleurs ni les entités.
- Un service peut réutiliser la méthode `getXxx(id)` (visibilité paquet) d'un autre service pour
  charger une entité avec la bonne erreur 404.
- `update` : après `getXxx(id)`, `VerrouOptimiste.verifier(entite.getVersion(), request.version())`
  (409 si le client a lu une version périmée) ; après `apply`, `repository.flush()` avant de
  convertir en `Response`, pour renvoyer la version incrémentée.
- Une règle qui dépend de plusieurs lignes (ex. total journalier) se protège des écritures
  simultanées par un verrou pessimiste sur la ligne parente (`@Lock(PESSIMISTIC_WRITE)` avec un
  délai d'attente borné par `@QueryHint` dans le repository, voir
  `UtilisateurRepository.findVerrouilleById`), dans une transaction
  `@Transactional(isolation = Isolation.READ_COMMITTED)` : sous l'isolation par défaut de MariaDB
  (REPEATABLE READ), la première lecture fige la vue de la transaction, et un calcul fait après
  l'attente du verrou ignorerait les écritures validées entre-temps (voir `SaisieTempsService`).
- Date du jour : `LocalDate.now(clock)` avec le bean `Clock`, dans le fuseau
  `Constantes.FUSEAU_HORAIRE` ; jamais `LocalDate.now()` sans argument.

### Contrôleurs
- Retournent toujours une `ApiResponse<T>` (voir ci-dessous) ; `@Valid @RequestBody` sur les entrées,
  `@Validated({ Default.class, Modification.class }) @RequestBody` sur les `PUT`.
- `POST` → 201 + en-tête `Location` ; `DELETE` → 200 avec `data: null` et un message de confirmation.
  Exception : un `POST` qui crée plusieurs ressources d'un coup renvoie 201 avec leur liste (éventuellement
  vide) et un message, sans `Location` (voir `POST /api/clotures/tous-projets`).
- Les filtres de liste sont des `@RequestParam(required = false)`, ou un record validé lu dans les
  paramètres (`@Valid RechercheSaisiesRequest`) quand des règles portent sur plusieurs filtres.
- Toute liste est paginée : paramètre `@Valid PaginationRequest pagination`, réponse
  `ApiResponse<PageResponse<T>>` (`PageResponse.from(page, XxxResponse::from)`) ; le tri est imposé
  par le service (`pagination.versPageRequest(Sort.by(...))`), jamais choisi par le client.

## Sécurité

- Authentification par jeton OIDC (resource server JWT, `SecurityConfig`), sans session : signature,
  émetteur, **audience** (`OIDC_AUDIENCE`) et expiration vérifiés ; rôle administrateur = valeur
  `Constantes.ROLE_ADMIN` dans la revendication des rôles.
- Règles grossières par URL et rôle dans `SecurityConfig` (lecture pour tout titulaire d'une fiche
  active ou administrateur, sa propre fiche `/api/utilisateurs/moi` pour tout authentifié, liste des
  utilisateurs et écritures de référentiel réservées à l'administrateur) ; règles fines (« ses propres saisies », membres d'un
  projet) dans les **services**, via `UtilisateurCourantService` (`estAdmin()`, `get()`) et
  `AccesProjetService` (`verifierAcces`, `utilisateurRestreint`, `estMembre`, `estResponsable`), en
  levant `AccesRefuseException`. Jamais de contrôle d'accès dans un contrôleur.
- Un collaborateur ne lit que les projets dont il est **membre** (et leurs tâches, membres,
  clôtures) : listes restreintes, 403 sur un projet existant dont il n'est pas membre.
- 401 et 403 de Spring Security passent par `GlobalExceptionHandler` (enveloppe `ApiResponse`).
- Un utilisateur est identifié par la revendication `sub` (colonne `utilisateur.sujet`), rattachée
  une fois par l'email du jeton, seulement s'il est déclaré vérifié (`email_verified`, voir
  `ProprietesSecurite.exigerEmailVerifie`), ou dès la création de sa fiche par inscription
  (`POST /api/utilisateurs/moi`).
- Actuator : en prod, sur un port de gestion séparé (`MANAGEMENT_PORT`) sans jeton, réservé au
  réseau interne ; sur le port de l'API (dev, test), santé publique et autres points réservés à
  l'administrateur. Tout nouveau point Actuator exposé suit cette règle (`SecurityConfig`).

## Exploitation

- Logs : SLF4J ; JSON ECS en prod (`logging.structured.format.console`). Chaque requête porte un
  identifiant de corrélation (`IdentifiantCorrelationFilter`, en-tête `X-Correlation-Id`, clé MDC
  `correlationId`) : ne pas le recréer dans le code, il est présent dans toutes les lignes de log.
- Jamais de donnée personnelle ni de valeur de requête SQL dans un log (nom de contrainte, type
  d'exception, identifiant technique seulement).
- Toute variable d'environnement de production est ajoutée sans valeur à `.env.example` (bloc
  « Production uniquement ») et décrite dans `docs/DEPLOIEMENT.md` (§ Variables d'environnement) ; une variable facultative
  a une valeur par défaut dans `application-prod.yml`, jamais un secret.
- `GestionTempsApplicationProductionTest` démarre l'application en profil prod : toute nouvelle
  variable obligatoire de production y est ajoutée.

## Format des réponses et gestion des erreurs

Toutes les réponses, succès comme erreurs, utilisent l'enveloppe `ApiResponse` :

```json
{ "status": "success", "data": { }, "message": null }
{ "status": "error",   "data": null, "message": "Détail de l'erreur" }
```

Ne jamais renvoyer un objet nu ni un `ProblemDetail` depuis un contrôleur. Pour signaler une
erreur, **lever une exception héritant de `ApplicationException`** ; ne jamais lever une
`RuntimeException` brute (ni `IllegalArgumentException`, `IllegalStateException`…).

Chaque exception porte son code HTTP, que `GlobalExceptionHandler` applique automatiquement :

| Exception                          | HTTP | Usage                                                   |
|------------------------------------|------|---------------------------------------------------------|
| `ResourceNotFoundException`        | 404  | entité introuvable                                      |
| `DuplicateResourceException`       | 409  | contrainte d'unicité (code, email…)                     |
| `ResourceInUseException`           | 409  | suppression d'une ressource encore référencée           |
| `ModificationConcurrenteException` | 409  | version périmée envoyée en modification                 |
| `AccesRefuseException`             | 403  | droit insuffisant (saisie d'un autre, compte inconnu…)  |
| `BusinessRuleException`            | 422  | règle métier enfreinte (24 h/jour, ressource inactive…) |
| `ApplicationException`             | 500  | erreur technique (utilisée directement)                 |
| validation Bean Validation         | 400  | gérée automatiquement, champs en cause dans `message`   |

Pour un nouveau cas, créer une sous-classe d'`ApplicationException` qui passe son `HttpStatus` au
constructeur parent : aucun handler supplémentaire n'est nécessaire.

`GlobalExceptionHandler` traduit aussi trois exceptions techniques levées en cas d'accès
concurrents, toutes en 409 sans détail SQL : `DataIntegrityViolationException` (contrainte de base,
ex. doublon créé simultanément ; seul le nom de la contrainte est journalisé, jamais la valeur),
`ObjectOptimisticLockingFailureException` (`@Version`) et `PessimisticLockingFailureException`
(verrou non obtenu dans le délai). Les erreurs de Spring MVC (400, 404, 405, 415) ont des messages
en français.

Messages d'erreur en français, compréhensibles par un utilisateur final.

## Règles métier à préserver

- On ne supprime pas une ressource encore référencée : on la désactive (`actif = false`).
- Un utilisateur qui s'inscrit lui-même a une fiche **inactive** jusqu'à sa validation par un
  administrateur ; sans fiche active, un compte n'accède qu'à sa propre fiche (`/api/utilisateurs/moi`).
- Une saisie dure de 0,5 h à 24 h, par pas de 0,5 h (`Constantes.DUREE_MIN_SAISIE`,
  `DUREE_MAX_SAISIE`, `PAS_DUREE_SAISIE`).
- Le total des saisies d'un utilisateur sur une journée ne dépasse pas `Constantes.MAX_HEURES_JOUR` (24 h).
- Pas de nouvelle saisie pour un utilisateur, une tâche ou un projet désactivé ; une saisie
  existante reste corrigeable tant qu'on ne change ni l'utilisateur ni la tâche.
- Rôles d'un membre de projet (`RoleProjet`) : `MANAGER` (responsable) et `BACKUP` (suppléant)
  voient les saisies de tous les membres et clôturent ; `CONTRIBUTEUR` voit le projet et y saisit.
  L'utilisateur d'une saisie nouvelle ou réaffectée (autre utilisateur ou autre tâche) doit être
  membre du projet, quel que soit son rôle, administrateur compris (422) ; une saisie existante
  reste corrigeable après le retrait de son auteur.
- Le jour d'une saisie nouvelle ou déplacée (autre jour ou autre tâche) est compris dans la période
  du projet (`dateDebut`, `dateFin`, bornes incluses, nulles = ouvertes).
- Un mois clôturé pour un projet (`Cloture`) interdit de créer, modifier, déplacer (vers ou depuis
  ce mois) ou supprimer ses saisies, administrateur compris. Seul un mois terminé se clôture, par un
  administrateur, un responsable ou un suppléant du projet ; seul un administrateur le rouvre. Chaque écriture de saisie
  verrouille le projet en lecture et une clôture le verrouille en écriture (`ProjetRepository`) :
  une saisie ne peut pas s'intercaler pendant une clôture.

## Tests

- Classe de test nommée **classe cible + `Test`**, dans le même paquet que la classe testée
  (ex. `SaisieTempsControllerTest`, `GlobalExceptionHandlerTest`).
- Authentification : les tests MockMvc importent `JetonsDeTest.AdministrateurParDefaut` (chaque
  requête est faite en administrateur) et la remplacent au besoin par `.with(collaborateur(u))`,
  `.with(jwt())` ou `.with(anonymous())`. Toute règle d'accès est testée avec le rôle autorisé
  **et** un rôle refusé (voir `SecurityConfigTest`, droits dans `SaisieTempsControllerTest`).
- Contrôleurs : tests d'intégration
  `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional`.
- Noms de méthodes en français décrivant le comportement (`deleteProjetRefuseSiTachesExistantes`).
- Données préparées via les repositories dans des méthodes privées `save(...)`.
- Vérifier le corps sous `$.data` (succès) ou `$.message` (erreur).
- Chaque nouvelle règle métier s'accompagne d'un test du cas accepté **et** du cas refusé.
- Ne pas comparer les messages de Bean Validation mot pour mot : ils dépendent de la langue de la JVM.
- Les tests tournent sur MariaDB (même moteur qu'en production), dans un conteneur Testcontainers
  partagé par toute la suite (`application-test.yml`) : Docker doit être lancé.
- Une règle qui dépend de transactions réellement validées (accès concurrents, verrous) se teste
  dans une classe **sans** `@Transactional`, qui vide la base dans un `@AfterEach`
  (voir `SaisieTempsServiceTest`).
- `./mvnw verify` impose une couverture minimale des lignes du paquet `service`
  (`couverture.service.minimum` dans `pom.xml`) ; rapport dans `target/site/jacoco/index.html`.

## Base de données

- Le schéma est géré **uniquement par Flyway** (`src/main/resources/db/migration`), appliqué au
  démarrage dans tous les profils ; Hibernate est en `ddl-auto: validate` partout et refuse de
  démarrer si une entité ne correspond pas au schéma.
- Toute nouvelle entité, colonne, contrainte ou index exige un nouveau script
  `V<n>__description_en_snake_case.sql`, ajouté dans la même PR que l'entité et signalé dans sa
  description. Un script déjà fusionné n'est **jamais** modifié.
- Dans les scripts : SQL compatible MariaDB 11.4, tables `engine=InnoDB default charset=utf8mb4`,
  contraintes nommées `uk_<table>_<colonne>`, `fk_<table>_<cible>`, index `idx_<table>_<colonnes>`.
- `open-in-view` est désactivé : convertir les entités en DTO dans la transaction du service.
- Informations de connexion jamais versionnées : `application-*.yml` ne contient que des
  placeholders sans valeur par défaut (`${DB_PASSWORD}`). En dev, les valeurs sont dans `.env`
  (ignoré par Git) ; toute nouvelle variable est ajoutée, sans valeur, à `.env.example`.

## Interdictions

- Logs via `System.out.println()` ou `printStackTrace()` : utiliser SLF4J
  (`LoggerFactory.getLogger(...)`).
- Nombres magiques en dur : les déclarer dans `Constantes` (voir « Constantes »).
- SQL natif ou requêtes concaténées : utiliser les méthodes du repository (voir « Repositories »).
  Les scripts de migration Flyway (DDL) ne sont pas concernés : c'est le seul endroit où du SQL est écrit.
- Appeler un repository depuis un contrôleur : toujours passer par le service.
- Lever une `RuntimeException` brute : utiliser une sous-classe d'`ApplicationException`.
- Exposer une entité JPA dans une réponse : passer par un DTO.
