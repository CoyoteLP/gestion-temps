# Plan : lot F3b — tri et filtres des listes

> **État (2026-11-14)** : plan validé (une seule PR ; un seul mécanisme de filtre pour toutes les
> listes, y compris l'écran Utilisateurs ; membres d'un projet triés et filtrés comme les autres),
> implémenté sur `feature/tri-filtres-listes` ; `./mvnw verify` (396 tests) et `web/` (409 tests,
> build) verts ; `/review` et `web:review` faites et appliquées ; parcours de bout en bout validé
> (2026-11-14), sans largeur minimale de colonne pour l'instant.
>
> Précisions de réalisation :
> - colonnes de tri en énumérations (`TriProjet`…) dont la valeur d'API (`dateDebut`, `asc`) est
>   celle de l'URL et d'OpenAPI ; une valeur inconnue → 400 qui liste les valeurs admises ;
> - tri des membres par rôle : expression `case` passée en tri « non sûr » (constante, aucune
>   donnée du client), enveloppée dans `coalesce` pour que Spring Data ne la préfixe pas ;
> - **ligne de filtres repliable** (demande du 2026-11-14) : masquée par défaut, affichée ou masquée
>   par une loupe à droite de l'en-tête (colonne d'actions, présente dans toutes les listes), ouverte
>   d'office si un filtre est actif ; loupe mise en évidence quand un filtre est actif ;
> - « valeurs absentes en dernier » réservé à la date de début (seule colonne triable facultative) ;
> - `IllegalArgumentException` du convertisseur de paramètres admise par `CLAUDE.md` (contrat Spring) ;
> - ouvrir les filtres ne change pas la largeur des colonnes : chaque champ prend celle de sa
>   colonne (le libellé d'une liste de choix est tronqué si besoin) ;
> - front : « Effacer les filtres » est un lien ; l'option « Tous » sans valeur passe par une valeur
>   interne (`*`), Radix Select refusant les valeurs vides.

Lot backend et front, décidé le 2026-11-13 (feuille de route : [`front-end-socle.md`](front-end-socle.md)).
Aujourd'hui, les listes sont paginées par l'API et triées par identifiant ; l'utilisateur ne peut ni
trier ni filtrer. Trier ou filtrer seulement la page affichée serait trompeur : c'est l'API qui trie
et filtre toute la liste.

Décisions déjà prises avec vous (2026-11-13) :

| Sujet | Décision |
|---|---|
| Où | **Par l'API** : paramètres de tri et filtres par colonne, liste blanche par ressource. |
| Tri | Clic sur l'en-tête d'une colonne triable : croissant, puis décroissant ; icône ↑ ou ↓. |
| Filtres | **Selon le type de colonne** : zone « contient » pour le texte, liste Tous / Actif / Inactif pour le statut, pas de filtre de date au départ ; appliqué après une courte pause de frappe. |
| État | Tri, sens et filtres conservés dans l'URL ; la page revient à 1 à chaque changement. |
| Composant | Un composant de tableau commun à toutes les listes. |

## 1. API (backend)

### Paramètres communs

- `tri` : nom de la colonne, **dans une liste blanche propre à chaque ressource** (énumération, ex.
  `TriProjet`, valeurs `code`, `nom`… dans l'API et dans OpenAPI) ; toute autre valeur → 400
  « Paramètre invalide », complété par la liste des valeurs admises.
- `sens` : `asc` (par défaut) ou `desc` ; autre valeur → 400.
- Filtres et tri d'une liste lus dans un record validé (`RechercheProjetsRequest`…), comme
  `RechercheSaisiesRequest`.
- Sans `tri`, le tri actuel (identifiant croissant) est conservé : **compatible** avec les clients
  existants. Avec `tri`, l'identifiant reste un tri secondaire, pour une pagination stable.
- Filtres texte : « contient », insensibles à la casse **et aux accents** (collation de la base
  `utf8mb4_uca1400_ai_ci` : « equipe » trouve « Équipe »), 100 caractères au plus (`@Size`). Les
  caractères `%` et `_` saisis sont échappés (recherchés tels quels, pas comme jokers).
- Requêtes JPQL dans les repositories, paramètres nommés ; aucune concaténation de la saisie.

### Par ressource

| Ressource | Tri (`tri`) | Filtres |
|---|---|---|
| `GET /api/projets` | `code`, `nom`, `dateDebut` (période), `actif` | `code`, `nom` (contient), `actif` |
| `GET /api/utilisateurs` | `nom` (puis prénom), `email`, `creeLe` (inscription), `actif` | `nom` (nom **ou** prénom contient), `email` (contient), `actif` (existant) |
| `GET /api/taches?projetId=` | `libelle`, `actif` | `libelle` (contient), `actif` |
| `GET /api/projets/{id}/membres` | `nom` (puis prénom), `email`, `role` | `nom` (nom **ou** prénom contient), `email` (contient), `role` |

- Membres : le tri par rôle suit l'importance (Responsable, Suppléant, Contributeur), pas l'ordre
  alphabétique des codes. La réponse ne change pas (identifiant de l'utilisateur) : le front y
  associe les noms comme aujourd'hui (écran réservé à l'administrateur).

- Un projet sans date de début apparaît **après** les autres, quel que soit le sens.
- « Mon rôle » n'est ni triable ni filtrable : il dépend de l'appelant (hors périmètre).
- Les restrictions d'accès de F3a s'appliquent avant les filtres (un collaborateur filtre parmi
  ses projets seulement).
- Les saisies (lot F4) et les clôtures (sans écran) ne sont pas concernées par ce lot.

### Convention à reformuler (`CLAUDE.md`, Contrôleurs)

Aujourd'hui : « le tri est imposé par le service, jamais choisi par le client ». Devient : « le
client choisit le tri parmi une **liste blanche** déclarée par la ressource (énumération), le service
impose le tri par défaut et le tri secondaire par identifiant ; une valeur hors liste → 400 ».

## 2. Front

- **Composant commun** `TableauListe` (Server Component) : colonnes déclarées (`cle`, `libelle`,
  `triable`, `filtre` : `texte` | `choix` (statut, rôle) | aucun, visibilité selon la largeur
  d'écran) ; les lignes restent rendues par chaque liste. Un **préfixe** d'URL par liste sépare les
  paramètres de deux listes d'une même page (fiche projet : tâches sans préfixe, membres avec
  `membres.` : `membres.tri`, `membres.page`…) ; les paramètres de l'autre liste sont conservés.
  Un filtre de choix peut avoir une valeur par défaut (écran Utilisateurs : « En attente ») ; « Tous »
  est alors une valeur explicite dans l'URL. Il produit :
  - les **en-têtes triables** : liens qui changent `tri` et `sens` dans l'URL (page remise à 1),
    icône ↑, ↓ ou ⇅ (colonne triable non triée), `aria-sort` sur la colonne triée, libellé
    accessible « Trier par Nom, ordre croissant » ;
  - une **ligne de filtres** sous les en-têtes (Client Component `FiltresColonnes`) : zone de saisie
    ou liste de choix selon la colonne, libellé accessible (« Filtrer par nom »), application après
    300 ms sans frappe (`DELAI_FILTRE_MS` dans `constantes.ts`) par `router.replace`, sans
    recharger toute la page ; bouton « Effacer les filtres » quand un filtre est actif.
- Lecture des paramètres dans l'URL : une fonction par liste, qui ne garde que les valeurs admises
  (comme `lirePage`) ; une valeur inconnue est ignorée plutôt que de provoquer un 400 de l'API.
- `PaginationListe` conserve tri et filtres d'une page à l'autre (paramètres déjà pris en charge).
- Listes concernées : **Projets**, **Utilisateurs**, **Tâches** et **Membres** (fiche projet ; les
  membres deviennent une liste paginée).
- Écran Utilisateurs : les liens « En attente / Actifs / Tous » disparaissent, remplacés par le
  filtre de la colonne Statut (« En attente » par défaut) : un seul mécanisme pour toutes les listes.
- Message quand aucun résultat ne correspond aux filtres : « Aucun projet ne correspond aux
  filtres. » (distinct de « Aucun projet. »).

## 3. Documentation

- `CLAUDE.md` : convention de tri (ci-dessus) ; `web/CLAUDE.md` : `TableauListe` pour toute liste.
- `README.md` : paramètres `tri`, `sens` et filtres de chaque liste.
- Plans : état.

## Tests (cas accepté et cas refusé)

- API, par ressource : tri croissant et décroissant sur chaque colonne admise, tri secondaire par
  identifiant ; `tri` ou `sens` inconnu → 400 ; filtres texte (casse, accents, `%` et `_` cherchés
  littéralement, longueur maximale → 400), filtre de statut ; combinaison avec la pagination et avec
  la restriction aux projets du collaborateur ; dates absentes en dernier.
- Front : lecture des paramètres (valeurs admises et ignorées) ; en-têtes (lien, sens suivant,
  `aria-sort`, icône) ; filtres (pause de frappe, remise à la page 1, effacement) ; message « aucun
  résultat » ; conservation du tri et des filtres par la pagination.
- `./mvnw verify` et les vérifications de `web/` vertes.

## Hors périmètre

- Tri et filtre des saisies (lot F4) et des clôtures.
- Filtres de date, recherche globale (toutes colonnes), choix de la taille de page.
- Tri ou filtre sur « Mon rôle ».
- Noms des utilisateurs dans la réponse des membres (le front les associe, comme aujourd'hui).
