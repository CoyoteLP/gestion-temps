---
name: review
description: Revue de code des modifications en cours du projet gestion-temps au regard des conventions de CLAUDE.md (architecture 3 couches, exceptions, ApiResponse, constantes, repositories, Javadoc, tests, règles métier), de la sécurité (injection, XSS, exposition de données, validation des entrées) et de la performance (N+1, requêtes inutiles, listes non bornées). À utiliser quand on demande une revue, une relecture ou une vérification des changements avant commit ou PR.
argument-hint: "[fichier, dossier ou branche à comparer] (défaut : modifications non commitées)"
---

# Revue de code — gestion-temps

Relire les modifications et signaler les écarts aux conventions de l'équipe. **Ne rien modifier** :
la revue produit un rapport ; les corrections ne sont appliquées que si l'utilisateur le demande ensuite.

## 1. Déterminer le périmètre

- Argument fourni (`$ARGUMENTS`) :
  - un fichier ou un dossier : relire ce périmètre ;
  - un nom de branche : relire `git diff <branche>...HEAD`.
- Sans argument : relire `git diff HEAD` **et** les fichiers non suivis (`git status --short`) ;
  le projet peut contenir des fichiers jamais commités.
- Lire chaque fichier modifié en entier, pas seulement le diff : une convention se vérifie souvent
  dans le contexte (imports, autres méthodes de la classe).

## 2. Relire `CLAUDE.md`

Relire `CLAUDE.md` à la racine avant la revue : c'est la référence. Les points ci-dessous en sont un
rappel ; en cas de divergence, `CLAUDE.md` fait foi.

## 3. Points de contrôle

**Architecture**
- Contrôleur sans logique métier et sans appel direct à un repository.
- Règles métier dans le service, pas dans le contrôleur ni l'entité.
- Aucune entité JPA dans une réponse : toujours un DTO `XxxResponse` avec `from(Entite)`.

**Réponses et erreurs**
- Les contrôleurs renvoient `ApiResponse<T>` ; `POST` → 201 + `Location`, `DELETE` → 200 + message.
- Erreurs signalées par une sous-classe d'`ApplicationException` ; jamais `RuntimeException`,
  `IllegalArgumentException`, `IllegalStateException`.
- Code HTTP cohérent avec le tableau de `CLAUDE.md` (404, 409, 422, 500).
- Messages d'erreur en français, compréhensibles par un utilisateur final.

**Repositories**
- Recherche d'une seule entité → `Optional`.
- Pas de SQL natif (`nativeQuery = true`) ni de requête concaténée ; JPQL seulement dans un `@Query`
  avec paramètres nommés.

**Conventions de code**
- Nommage : vocabulaire métier en français, lowerCamelCase / UpperCamelCase / UPPER_SNAKE_CASE.
- Pas de nombre magique : valeurs significatives dans `common.Constantes` (sauf tailles
  dans les annotations `@Size` / `@Column`).
- Pas de `System.out.println` ni `printStackTrace` : SLF4J.
- Javadoc sur les classes et méthodes publiques nouvelles ou modifiées (`@param`, `@return`, `@throws`).
- Indentation par tabulations.

**Entités et base de données**
- Lombok `@Getter @Setter @NoArgsConstructor`, jamais `@Data`.
- `@ManyToOne(fetch = FetchType.LAZY, optional = false)` + `@JoinColumn` explicite.
- Nouvelle entité, colonne, contrainte ou index → nouveau script Flyway `V<n>__….sql` dans la même
  PR (*Bloquant* s'il manque : l'application ne démarre plus, `ddl-auto: validate`).
- Script Flyway déjà fusionné modifié → *Bloquant* (la somme de contrôle ne correspond plus en production).

**Règles métier** (voir la section dédiée de `CLAUDE.md`)
- Une modification ne doit pas contourner une règle existante : suppression d'une ressource
  référencée, 24 h par jour, durée de 0,5 à 24 h par pas de 0,5, ressources désactivées.

**Tests**
- Toute nouvelle règle ou correction a un test du cas accepté **et** du cas refusé.
- Classe de test = classe cible + `Test`, dans le même paquet.
- Assertions sous `$.data` / `$.message` ; pas de comparaison mot pour mot des messages Bean
  Validation par défaut.

**Documentation**
- `README.md` mis à jour si l'API change (endpoint, paramètre, règle, format).

## 4. Sécurité

Suivre chaque donnée venant du client (corps JSON, `@PathVariable`, `@RequestParam`, en-têtes)
jusqu'à son utilisation, et vérifier qu'elle ne peut pas détourner le comportement prévu.

**Injection**
- SQL / JPQL : aucune requête construite par concaténation ou `String.format` avec une valeur
  d'entrée, y compris dans `@Query`, `EntityManager.createQuery`, `createNativeQuery`, critères de
  tri ou noms de colonnes ; uniquement des paramètres liés (`:param`) ou des méthodes dérivées.
- Tri ou filtre dynamique : le nom de champ fourni par le client doit être comparé à une liste
  blanche avant d'être utilisé.
- Autres interpréteurs : pas d'entrée utilisateur dans une commande système (`Runtime.exec`,
  `ProcessBuilder`), un chemin de fichier, une expression SpEL, un motif de log non échappé
  (injection de retours à la ligne dans les logs).

**XSS et contenu renvoyé**
- L'API renvoie du JSON : vérifier que les réponses restent en `application/json` (pas de
  `text/html`, pas de HTML construit par concaténation, pas de `@ResponseBody String` contenant
  une entrée utilisateur).
- Les champs texte libres (`commentaire`, `description`…) sont stockés tels quels : c'est au client
  de les échapper à l'affichage. Le signaler en *Suggestion* si un nouveau champ libre apparaît,
  et en *Bloquant* si le serveur génère lui-même du HTML ou du contenu interprété avec.

**Validation des entrées**
- Tout `@RequestBody` porte `@Valid` ; chaque champ du `Request` a ses contraintes (`@NotNull`,
  `@Size` cohérent avec la longueur de colonne, bornes numériques).
- Un identifiant reçu (`projetId`, `tacheId`…) est rechargé en base, jamais utilisé pour construire
  une entité « à la main » (`new Projet()` + `setId`).
- Pas d'affectation de masse : le DTO d'entrée n'expose pas de champ que le client ne doit pas
  pouvoir modifier (identifiant, champ calculé, état réservé).

**Exposition de données**
- Une réponse d'erreur ne contient ni trace de pile, ni message d'exception technique, ni requête
  SQL, ni nom de classe : seulement un message métier (le handler générique renvoie
  « Erreur interne du serveur »).
- Pas de donnée sensible dans les logs (mot de passe, jeton, donnée personnelle au-delà du
  nécessaire) ni dans les réponses (un `XxxResponse` n'expose que ce qui est utile).
- Pas de secret en dur (mot de passe, clé, URL avec identifiants) dans le code ou les fichiers
  `application*.yml` versionnés : variables d'environnement uniquement.

**Contrôle d'accès**
- Tout nouvel endpoint est couvert par `SecurityConfig` : écriture de référentiel réservée au rôle
  administrateur, lecture authentifiée ; *Bloquant* s'il est public ou ouvert à tort.
- Une règle « ses propres données » ou « membre du projet » est vérifiée dans le service avec
  `UtilisateurCourantService` et `AccesRefuseException` ; *Bloquant* si elle manque, ou si un
  identifiant d'utilisateur fourni par le client est cru sans contrôle (ex. `utilisateurId` d'un
  collaborateur différent du sien).
- Chaque règle d'accès a un test du rôle autorisé et d'un rôle refusé (403), et un test sans jeton
  (401) pour un nouvel endpoint.

**Dépendances**
- Nouvelle dépendance dans `pom.xml` : version explicite ou gérée par le parent Spring Boot, pas de
  version `SNAPSHOT` ni de dépôt Maven non officiel.

## 5. Performance

Raisonner en nombre de requêtes SQL par appel d'API : il doit rester constant, quel que soit le
volume de données.

**Problème N+1**
- Repérer les boucles (ou `stream().map(...)`) sur une liste d'entités qui accèdent à une relation
  `LAZY` (`saisie.getTache().getLibelle()`, `tache.getProjet().getNom()`) : une requête par élément.
- Exception : lire seulement l'identifiant d'une relation (`getProjet().getId()`) ne déclenche pas de
  requête avec Hibernate, le proxy le connaît déjà.
- Correctif attendu : `@EntityGraph(attributePaths = ...)` ou `join fetch` dans la requête du
  repository, ou une projection DTO en JPQL.
- Collections `@OneToMany` : jamais en `EAGER` ; attention aux `join fetch` de plusieurs collections
  (produit cartésien).

**Accès inutiles à la base**
- Même entité chargée plusieurs fois dans un même traitement (`findById` répété, `existsById` suivi
  de `findById`) : réutiliser l'entité chargée.
- Chargement d'entités pour ne lire qu'un compteur ou une existence : préférer `existsBy…`,
  `countBy…` ou un agrégat JPQL.
- Requête dans une boucle (`for (id : ids) repository.findById(id)`) : `findAllById` ou une requête
  `in`.
- Filtrage, tri ou calcul fait en Java sur `findAll()` alors qu'il pourrait être fait en SQL.
- Appel à `save()` superflu sur une entité déjà gérée dans la transaction (modification suivie
  automatiquement).

**Volumétrie**
- Liste renvoyée sans limite (`findAll()` exposé tel quel) sur une table appelée à grossir
  (`saisie_temps`) : le signaler en *Suggestion* avec une pagination (`Pageable`) ou un filtre
  obligatoire.
- Colonne utilisée en filtre fréquent (`jour`, clés étrangères) sans index : proposer l'index
  dans un script Flyway.

**Transactions**
- Lecture seule : `@Transactional(readOnly = true)` (hérité de la classe de service).
- Pas d'appel réseau, de traitement long ou d'attente dans une transaction d'écriture.

**Vérifier plutôt que supposer**
- En cas de doute sur un N+1, le démontrer : lancer le test concerné avec
  `-Dspring.jpa.show-sql=true` (ou `-Dlogging.level.org.hibernate.SQL=DEBUG`) et compter les
  requêtes émises pour une liste de plusieurs éléments. Indiquer ce comptage dans le rapport.

## 6. Vérifier

- Lancer `./mvnw test` et indiquer le résultat (nombre de tests, échecs éventuels avec leur sortie).
- Ne signaler un problème que s'il est **avéré** dans le code relu : citer la ligne, pas une supposition.

## 7. Rapport

Répondre en français, avec les constats classés du plus grave au moins grave :

```
### Bloquant      — bug, règle métier contournée, faille, test en échec
### À corriger    — écart à une convention de CLAUDE.md
### Suggestion    — amélioration facultative
```

Pour chaque constat : sa catégorie (`[Conventions]`, `[Sécurité]` ou `[Performance]`), le lien
`[Fichier.java:42](chemin#L42)`, le problème en une phrase, la règle concernée, et la correction
proposée. Une faille de sécurité exploitable est toujours *Bloquant* ; pour un problème de
performance, préciser le scénario (ex. « 1 + 2N requêtes pour une liste de N saisies »). Terminer par le résultat des tests et, s'il n'y a
aucun constat, le dire clairement plutôt que d'en inventer.
