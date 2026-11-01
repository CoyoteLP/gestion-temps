# CLAUDE.md

Conventions de l'équipe pour le projet **gestion-temps** : API REST de gestion du temps de travail
(Spring Boot 4, Java 21, JPA, MariaDB). Ce fichier est versionné ; les préférences personnelles
vont dans `CLAUDE.local.md` (non versionné).

## Commandes

```bash
./mvnw test                                         # tous les tests (H2 en mémoire, sans MariaDB)
./mvnw test -Dtest=SaisieTempsControllerTest        # une classe de test
./mvnw spring-boot:run                              # profil dev (MariaDB locale)
```

Lancer `./mvnw test` après toute modification et avant de déclarer une tâche terminée.

Skills du projet (`.claude/skills/`) :
- `/review [périmètre]` : revue des modifications (conventions de ce fichier, sécurité,
  performance), sans rien modifier.
- `/test [cible]` : écrit ou complète les tests d'une cible puis les lance ; sans argument, lance
  toute la suite et diagnostique les échecs.

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
  (`projetId`, `tacheId`).
- Un champ booléen optionnel en entrée est un `Boolean` (null = valeur par défaut).

### Services
- `@Service @RequiredArgsConstructor @Transactional(readOnly = true)` sur la classe,
  `@Transactional` sur les méthodes d'écriture.
- Une méthode privée `apply(request, entite)` partagée par `create` et `update`.
- Les règles métier vivent ici, pas dans les contrôleurs ni les entités.
- Un service peut réutiliser la méthode `getXxx(id)` (visibilité paquet) d'un autre service pour
  charger une entité avec la bonne erreur 404.

### Contrôleurs
- Retournent toujours une `ApiResponse<T>` (voir ci-dessous) ; `@Valid @RequestBody` sur les entrées.
- `POST` → 201 + en-tête `Location` ; `DELETE` → 200 avec `data: null` et un message de confirmation.
- Les filtres de liste sont des `@RequestParam(required = false)`.

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

| Exception                     | HTTP | Usage                                                   |
|-------------------------------|------|---------------------------------------------------------|
| `ResourceNotFoundException`   | 404  | entité introuvable                                      |
| `DuplicateResourceException`  | 409  | contrainte d'unicité (code, email…)                     |
| `ResourceInUseException`      | 409  | suppression d'une ressource encore référencée           |
| `BusinessRuleException`       | 422  | règle métier enfreinte (24 h/jour, ressource inactive…) |
| `ApplicationException`        | 500  | erreur technique (utilisée directement)                 |
| validation Bean Validation    | 400  | gérée automatiquement, champs en cause dans `message`   |

Pour un nouveau cas, créer une sous-classe d'`ApplicationException` qui passe son `HttpStatus` au
constructeur parent : aucun handler supplémentaire n'est nécessaire.

Messages d'erreur en français, compréhensibles par un utilisateur final.

## Règles métier à préserver

- On ne supprime pas une ressource encore référencée : on la désactive (`actif = false`).
- Une saisie dure de 0,5 h à 24 h, par pas de 0,5 h (`Constantes.DUREE_MIN_SAISIE`,
  `DUREE_MAX_SAISIE`, `PAS_DUREE_SAISIE`).
- Le total des saisies d'un utilisateur sur une journée ne dépasse pas `Constantes.MAX_HEURES_JOUR` (24 h).
- Pas de nouvelle saisie pour un utilisateur, une tâche ou un projet désactivé ; une saisie
  existante reste corrigeable tant qu'on ne change ni l'utilisateur ni la tâche.

## Tests

- Classe de test nommée **classe cible + `Test`**, dans le même paquet que la classe testée
  (ex. `SaisieTempsControllerTest`, `GlobalExceptionHandlerTest`).
- Contrôleurs : tests d'intégration
  `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional`.
- Noms de méthodes en français décrivant le comportement (`deleteProjetRefuseSiTachesExistantes`).
- Données préparées via les repositories dans des méthodes privées `save(...)`.
- Vérifier le corps sous `$.data` (succès) ou `$.message` (erreur).
- Chaque nouvelle règle métier s'accompagne d'un test du cas accepté **et** du cas refusé.
- Ne pas comparer les messages de Bean Validation mot pour mot : ils dépendent de la langue de la JVM.

## Base de données

- Le profil `prod` utilise `ddl-auto: validate` : toute nouvelle entité ou colonne exige un script
  de migration du schéma de production, à signaler dans la PR.
- `open-in-view` est désactivé : convertir les entités en DTO dans la transaction du service.
- Informations de connexion jamais versionnées : `application-*.yml` ne contient que des
  placeholders sans valeur par défaut (`${DB_PASSWORD}`). En dev, les valeurs sont dans `.env`
  (ignoré par Git) ; toute nouvelle variable est ajoutée, sans valeur, à `.env.example`.

## Git

- Ne pas committer ni pousser sans demande explicite.
- Mettre à jour le `README.md` (endpoints, règles, format) quand l'API change.

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
Portée facultative, en minuscules : `saisie`, `projet`, `tache`, `utilisateur`, `config`…
Changement incompatible de l'API : `!` après le type (`feat(api)!: …`).

### Versions

- Versionnement sémantique `MAJEUR.MINEUR.CORRECTIF`, identique dans `pom.xml` et dans le tag Git
  (`v0.1.0`) ; pas de suffixe `-SNAPSHOT`.
- Changement de version sur `develop` : branche `chore/version-X.Y.Z` qui ne modifie que
  `pom.xml`, pull request intitulée `chore(release): version X.Y.Z`, fusion en squash.
- **Avant 1.0.0** (phase actuelle) : pas de release ni de tag. `main` reste sur la version
  d'initialisation (`0.0.1`) ; `develop` porte la version en cours (`0.1.0`, puis `0.2.0`…).
- **À partir de 1.0.0** : chaque version passe par une `release/X.Y.Z` qui la fige, est fusionnée
  dans `main` avec le tag `vX.Y.Z`, puis `develop` passe à la version mineure suivante (branche
  `chore/version-…`) ; un `hotfix/*` augmente le correctif (`1.0.0` → `1.0.1`).

### Qualité

- Fichiers en UTF-8, fins de ligne LF uniquement (`.gitattributes`, `.editorconfig`).
- Hooks versionnés dans `.githooks/`, à activer une fois par poste : `git config core.hooksPath .githooks`.
- L'intégration continue (`.github/workflows/ci.yml`) lance `./mvnw verify` sur chaque pull
  request vers `main` et `develop` ; les tests ne sont pas relancés avant chaque push local.

## Interdictions

- Logs via `System.out.println()` ou `printStackTrace()` : utiliser SLF4J
  (`LoggerFactory.getLogger(...)`).
- Nombres magiques en dur : les déclarer dans `Constantes` (voir « Constantes »).
- SQL natif ou requêtes concaténées : utiliser les méthodes du repository (voir « Repositories »).
- Appeler un repository depuis un contrôleur : toujours passer par le service.
- Lever une `RuntimeException` brute : utiliser une sous-classe d'`ApplicationException`.
- Exposer une entité JPA dans une réponse : passer par un DTO.
