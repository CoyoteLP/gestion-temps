# Plan : lot F4b — saisies de l'équipe et clôture des mois

> **État (2026-11-15)** : plan validé (points tranchés en fin de document) et implémenté ; API :
> 400 tests verts ; `web/` : lint, format, types, 606 tests Vitest et build verts ; revues `/review` et
> `web:review` faites et corrigées (props minimales du sélecteur, colonne « Clôturé le » réservée à
> l'administrateur, membre filtré gardé dans le filtre, tests des actions de la liste des projets). Branche `feature/saisies-equipe-clotures`, une seule PR
> (API + front) : `feat: consulter les saisies de l'équipe et clôturer les mois`.

Décisions de l'utilisateur (2026-11-15) :
- vue équipe sur une **page dédiée « Équipe »** (choix du projet et du mois) ;
- contenu : **récapitulatif** (total par membre, par tâche, du projet) **puis le détail** des saisies,
  paginé, filtrable par membre ;
- clôture et réouverture **sur la fiche projet**, et « Clôturer tous les projets » (admin) sur la
  **liste des projets** ;
- saisies des autres en **lecture seule** pour tous, administrateur compris (saisie ou correction
  pour un autre utilisateur : lot ultérieur) ;
- noms des membres : **ajoutés à la réponse des membres** de l'API ; récapitulatif **calculé par le
  front** (pas de nouvel endpoint) ; **une seule PR**.

## 1. API (changement compatible)

Aujourd'hui, un responsable ou un suppléant ne peut pas lire les noms des utilisateurs
(`GET /api/utilisateurs/**` réservé à l'administrateur) : la vue équipe afficherait « Utilisateur
n° 7 ».

- `MembreProjetResponse` : ajout de `nom` et `prenom` de l'utilisateur (pas l'email), après
  `utilisateurId`. Visibles de quiconque lit les membres du projet (administrateur, membres du
  projet : règles inchangées).
- `MembreProjetRepository` : `@EntityGraph(attributePaths = "utilisateur")` sur la recherche
  paginée des membres et la lecture d'un membre, pour éviter une requête par membre (N+1, à
  vérifier en comptant les requêtes).
- Le tri et les filtres des membres ne changent pas.
- Tests : `MembreProjetControllerTest` (nom et prénom présents, en administrateur et en
  collaborateur membre ; toujours 403 pour un non-membre) ; `README.md` (réponse des membres).
- Aucune migration, aucune variable d'environnement.

## 2. Page « Équipe » (`/equipe`)

Entrée de menu « Équipe » (icône `UsersIcon`), après « Saisies », dans le groupe `(compte-actif)`.

- **Projets proposés** : ceux dont l'utilisateur est responsable ou suppléant (`monRole` MANAGER ou
  BACKUP), actifs ou non ; tous les projets pour l'administrateur. Sélecteur en tête de page.
  Contributeur seul (aucun projet proposé) : encadré d'information « La vue Équipe est réservée aux
  responsables et suppléants d'un projet ».
- **URL** : `/equipe?projet=3&mois=2026-10` ; projet par défaut = le premier proposé (par code), mois
  par défaut = mois en cours (Europe/Paris). Projet inconnu ou non proposé → premier projet ; mois
  invalide → mois en cours.
- **Navigation par mois** : mois précédent, mois en cours, mois suivant (comme la navigation par
  semaine de F4).
- **Statut du mois** : badge « Clôturé » (cadenas) ou « Ouvert » ; à côté, « Clôturer ce mois »
  (mois terminé et ouvert ; administrateur, responsable, suppléant) ou « Rouvrir » (mois clôturé ;
  administrateur), mêmes dialogues que sur la fiche projet (§ 3).
- **Récapitulatif du mois** (lecture de toutes les saisies du mois du projet, pages de 100) :
  - **par membre** : nom, rôle, total ; tous les membres actuels (0 h
    compris, pour repérer un oubli), puis les auteurs de saisies qui ne sont plus membres
    (« Ancien membre (n° 12) ») ; trié par nom ;
  - **par tâche** : tâche (même désactivée), total ; trié par libellé ;
  - **total du projet** pour le mois.
- **Détail des saisies** : `TableauListe` (préfixe `saisies.`), paginé par l'API, trié par jour
  (ordre imposé par l'API, pas de colonne triable) ; colonnes jour, membre, tâche, durée,
  commentaire ; filtre **Membre** (choix parmi les membres et anciens auteurs, filtre `utilisateurId`
  de l'API). Lecture seule.
- Droits : tout est vérifié par l'API (saisies d'un projet réservées aux responsables, suppléants et
  à l'administrateur ; 403 sinon, affiché avec `AlerteErreur`).

## 3. Clôtures

### Fiche projet (`/projets/[id]`), section « Clôtures »
- Visible de tous ceux qui voient le projet : liste des mois clôturés (`TableauListe`, préfixe
  `clotures.`, du plus récent au plus ancien, ordre de l'API) : mois (« octobre 2026 »), clôturé le,
  par (audit, administrateur seulement).
- **« Clôturer un mois »** (administrateur, responsable, suppléant du projet) : dialogue avec un
  champ mois (`type="month"`), mois précédent par défaut ; avertissement : « Les saisies de ce mois
  ne pourront plus être créées, modifiées ni supprimées. Seul un administrateur peut rouvrir le
  mois. » Mois en cours ou à venir, ou déjà clôturé → refus de l'API affiché en rouge, et contrôle
  avant envoi (même convention qu'en F4 : l'API refusera → erreur).
- **« Rouvrir »** (administrateur, par ligne) : `DialogueConfirmation`.

### Liste des projets (`/projets`), administrateur
- Bouton **« Clôturer tous les projets »** dans l'en-tête : dialogue avec le mois (mois précédent
  par défaut) ; résultat : « 4 projets clôturés pour octobre 2026 » (ou « aucun projet à clôturer :
  tous l'étaient déjà »).

### Côté saisie (F4)
- Rien à changer : la page Saisies lit déjà les clôtures (cadenas, lecture seule).

## 4. Code (front)

- `lib/api/` : `membres.ts` (type avec `nom`, `prenom` après `npm run api:types`), `clotures.ts`
  (`listerClotures(projetId, etat)`, `cloturerMois`, `cloturerTousLesProjets`, `rouvrirMois`),
  `saisies.ts` (`listerSaisiesDuProjet(projetId, du, au)` toutes pages, `rechercherSaisiesDuProjet`
  paginée avec filtre membre).
- `lib/equipe/` : lecture de la page (projets proposés, membres, saisies du mois), calcul du
  récapitulatif (`calculerRecapitulatif`), mois (`lireMois`, `moisPrecedent`…).
- `lib/clotures/` : schéma (`mois` AAAA-MM, mois terminé), Server Actions (`cloturerMoisAction`,
  `cloturerTousLesProjetsAction`, `rouvrirMoisAction`), revalidation des arguments (identifiants,
  mois).
- Composants : `selection-projet-equipe`, `navigation-mois`, `recapitulatif-mois`,
  `saisies-equipe` (détail), `clotures-projet`, `dialogue-cloture`, `cloture-tous-projets`.
- `MembresProjet` (administrateur) : inchangé ; il garde la lecture des fiches, pour l'email et le
  badge « Inactif » qu'il affiche (la réponse des membres n'expose que le nom).
- Messages : convention de couleurs de `web/CLAUDE.md`.

## 5. Tests

- API : `MembreProjetControllerTest` (noms, pas d'email, en administrateur et en membre). Requêtes
  comptées avec le journal SQL : la liste des membres charge les utilisateurs dans la même requête.
- Front : récapitulatif (membres sans saisie, anciens membres, tâches désactivées, totaux), lecture
  du mois et du projet dans l'URL (valeurs invalides), Server Actions de clôture (validation, refus
  de l'API, 403), composants (sélecteur, navigation, récapitulatif, clôtures avec et sans droits,
  dialogue de clôture, clôture de tous les projets).
- Bout en bout par l'utilisateur : en responsable, suppléant, contributeur et administrateur.

## 6. Documentation
- `README.md` : réponse des membres (API), page Équipe et clôtures (front).
- `front-end-socle.md` : F4b réalisé.

## Points validés (2026-11-15)
1. Menu « Équipe » **visible de tous** les comptes actifs (message d'information pour un
   contributeur).
2. Mois par défaut de la page Équipe : **le mois en cours**.
3. **« Clôturer ce mois »** aussi sur la page Équipe, à côté du statut (administrateur,
   responsable, suppléant ; mois terminé), en plus de la fiche projet ; « Rouvrir » (administrateur)
   au même endroit quand le mois est clôturé.
4. Récapitulatif par membre : **le total seulement** (pas de nombre de jours).

## Hors périmètre
- Saisie, correction ou suppression pour un autre utilisateur (administrateur).
- Export (CSV, tableur) du récapitulatif.
- Récapitulatif calculé par l'API (si les volumes l'exigent plus tard).

## Évolution demandée au bout en bout (2026-11-15) : synthèse mensuelle (administrateur)

Décisions : synthèse **en tête de la page Équipe** pour l'administrateur, total calculé par un
**endpoint de l'API** (une requête), projets **actifs plus ceux qui ont des saisies ou une clôture**
dans le mois, bouton « Clôturer tous les projets » **déplacé** de la liste des projets vers la
synthèse.

- API : `GET /api/projets/synthese?mois=AAAA-MM` (paginé, trié par code, administrateur seulement
  dans `SecurityConfig`) → `SyntheseProjetResponse` (projet, code, nom, actif, `totalHeures`,
  `clotureId`), projection JPQL avec sous-requêtes (somme des saisies du mois, clôture du mois) :
  une requête et son comptage. Tests : totaux du mois seul, projets retenus, 403 responsable,
  401 anonyme, 400 mois absent ou invalide.
- Front : `SyntheseMois` (projet avec lien vers son détail, statut, total ; cadenas « Clôturer »
  pour un mois terminé, « Rouvrir » pour un mois clôturé ; « Clôturer tous les projets ouverts »
  pour le mois affiché), lue en parallèle de la liste des projets ; navigation par mois remontée en
  tête de page. La liste des projets retrouve son seul bouton « Nouveau projet ».

Compléments demandés (2026-11-15) :
- synthèse filtrable par **projet** (texte du code ou du nom, paramètre `projet`) et par **statut**
  (paramètre `cloture` : `true` clôturé, `false` ouvert) ; ligne **« Total général »** : l'API
  renvoie `{ projets, totalHeures }`, le total couvrant tous les projets filtrés (seconde requête
  d'agrégat), affiché en pied de liste (`TableauListe` accepte une ligne de pied) ;
- détail des saisies filtrable par **tâche** (`tacheId`, déjà accepté par l'API).
