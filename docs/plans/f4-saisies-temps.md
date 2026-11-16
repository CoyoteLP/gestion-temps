# Plan : lot F4 — saisie de mes temps

> **État (2026-11-14)** : plan validé (tableau simple pour la liste de la semaine, durée en champ
> numérique avec − / +, `?semaine=` = date du lundi ; recopies ajoutées) et implémenté sur
> `feature/saisies-temps` ; revue `web:review` faite et corrigée ; `web/` : lint, format, types,
> 504 tests Vitest et build verts.
> Réalisation : « Aller à la semaine du… » est un formulaire `next/form` (sans JavaScript côté
> client) ; la semaine précédente n'est lue que si la semaine affichée est vide.

Dernier lot d'écrans métier de la feuille de route ([`front-end-socle.md`](front-end-socle.md)),
front-end seulement : l'API des saisies et des clôtures existe et applique déjà toutes les règles.

## Contexte

API utilisée :

| Appel | Usage |
|---|---|
| `GET /api/saisies-temps?utilisateurId=&du=&au=` | saisies de la semaine affichée (paginées, 100 par page lues en entier) |
| `POST`, `PUT`, `DELETE /api/saisies-temps[/{id}]` | ajout, modification (avec `version`), suppression |
| `GET /api/projets`, `GET /api/taches` | projets visibles (avec `monRole`) et leurs tâches, pour les libellés et le choix |
| `GET /api/clotures?mois=` | mois clôturés des projets de l'utilisateur (une semaine peut chevaucher deux mois) |
| `GET /api/utilisateurs/moi` | fiche de l'utilisateur connecté (son identifiant) |

Règles appliquées par l'API (le front les reprend pour guider, l'API reste seule juge) : durée de
0,5 h à 24 h par pas de 0,5 h ; total d'une journée de 24 h au plus ; commentaire de 500 caractères
au plus ; seul un **membre** du projet y saisit ; tâche, projet et utilisateur actifs ; jour dans la
période du projet ; aucune écriture dans un **mois clôturé** pour le projet (422 sinon).

Piège : sans `utilisateurId`, la recherche renvoie à un administrateur les saisies **de tous** ;
le front passe donc toujours l'identifiant de la fiche de l'utilisateur connecté.

Décisions prises avec vous (2026-11-14) :

| Sujet | Décision |
|---|---|
| Saisie | **Vue semaine** : grille tâches × jours en lecture (cumuls, totaux) et liste des saisies ; ajout et modification dans un **dialogue**. Plusieurs saisies par tâche et par jour restent possibles. |
| Jours | Lundi à vendredi ; samedi et dimanche affichés seulement s'ils contiennent des saisies. |
| Périmètre | Mes saisies seulement. Saisies de l'équipe d'un projet, clôture et réouverture des mois : **lot F4b**. |
| Pour un autre | Pas de saisie pour un autre utilisateur en F4. |
| Préremplir | Depuis la semaine précédente (mêmes tâches, jours de la semaine, durées et commentaires), proposé **seulement sur une semaine vide**. |
| Recopier le lundi | Saisies du lundi recopiées **du mardi au vendredi, sur les jours vides** seulement. |
| Refus | Les saisies acceptées sont créées ; un **compte rendu** liste celles refusées par l'API et pourquoi. |
| Consultation | Semaines précédentes : navigation semaine par semaine et choix d'une date (« Aller à la semaine du… »). |

## 1. Page `/saisies`

- **Semaine** lue dans l'URL (`?semaine=2026-11-09`, le lundi ; une date quelconque est ramenée à
  son lundi ; absente ou invalide : semaine en cours, fuseau `Europe/Paris`). Navigation « Semaine
  précédente », « Cette semaine », « Semaine suivante » (liens), et « Aller à la semaine du… »
  (choix d'une date, ramenée à son lundi) pour consulter une semaine passée.
- **Grille** (tableau en lecture) : une ligne par tâche saisie dans la semaine (« PJT001 · Dev »),
  une colonne par jour (date courte, aujourd'hui mis en évidence), cumul de la tâche ; ligne
  « Total du jour » et total de la semaine. Un jour dont le total atteint 24 h est signalé ; un
  jour de plus de 8 h porte un avertissement (`SEUIL_ALERTE_HEURES_JOUR`, front seulement : l'API
  ne refuse qu'à 24 h ; ajouté au bout en bout, décision du 2026-11-15).
  Durées au format français (`7,5 h`).
- **Liste des saisies de la semaine** (sous la grille), triée par jour puis par tâche : jour,
  projet · tâche, durée, commentaire ; par ligne, « Modifier » et « Supprimer » (confirmation).
  Liste bornée à la semaine, sans pagination : c'est un tableau simple (pas `TableauListe`, réservé
  aux listes paginées de l'API, voir les points à valider).
- **Mois clôturés** : une saisie d'un mois clôturé pour son projet est en lecture seule (cadenas,
  sans boutons) ; la colonne d'un jour clôturé pour tous les projets de l'utilisateur est grisée.
- Bouton « Nouvelle saisie » (et « + » sur chaque jour de la grille, jour présélectionné).

États particuliers :
- administrateur **sans fiche** : « Votre compte administrateur n'a pas de fiche utilisateur : la
  saisie des temps est réservée aux utilisateurs » ;
- membre d'**aucun projet** actif : « Vous n'êtes membre d'aucun projet : demandez à un
  administrateur de vous y ajouter » (et pas de bouton d'ajout) ;
- API injoignable : `AlerteErreur` habituelle.

## 2. Dialogue de saisie

- Champs : **projet** (projets actifs dont l'utilisateur est membre), puis **tâche** (tâches
  actives du projet choisi), **jour** (`type="date"`, semaine affichée par défaut sur le jour
  choisi, sinon aujourd'hui s'il est dans la semaine), **durée** (heures, pas de 0,5 : champ
  numérique `step=0.5`, ou boutons − / +), **commentaire** (facultatif, 500 caractères).
- Aide : « Déjà saisi ce jour : 6 h » (cumul de la journée, hors saisie modifiée) et maximum restant ;
  si la journée dépasse 8 h avec cette saisie, avertissement « la journée atteindra 8,5 h, au-delà
  de 8 h » (sans bloquer) ; au-delà de 24 h, erreur « Le total de la journée dépasse 24 h » (l'API
  refusera). Couleurs : information en bleu, avertissement en orange, erreur en rouge (convention de
  `web/CLAUDE.md`, décidée au bout en bout le 2026-11-15).
- Avertissements avant envoi (sans bloquer : l'API tranche) : jour hors de la période du projet,
  mois clôturé pour le projet.
- Modification : mêmes champs, `version` lue ; une saisie peut changer de jour ou de tâche (l'API
  vérifie). 409 → « Recharger » ; 422 (24 h, mois clôturé, non-membre, période) → message de l'API.
- Schéma zod partagé avec la Server Action : tâche choisie, jour au format date, durée de 0,5 à 24
  par pas de 0,5, commentaire ≤ 500.

## 3. Recopies

- **« Préremplir depuis la semaine précédente »** (semaine vide seulement, et seulement si la
  semaine précédente a des saisies) : chaque saisie de la semaine précédente est recréée le même jour
  de la semaine (lundi → lundi…), même tâche, même durée, même commentaire.
- **« Recopier le lundi sur la semaine »** (seulement si le lundi a des saisies et qu'un jour du
  mardi au vendredi est vide) : les saisies du lundi sont recréées sur chaque jour vide du mardi au
  vendredi ; le week-end n'est pas touché.
- Confirmation avant l'opération (nombre de saisies à créer). Server Action qui crée les saisies une
  par une, dans l'ordre des jours (l'API n'a pas d'appel groupé) : celles refusées (mois clôturé,
  tâche ou projet désactivé, période du projet, plus membre, 24 h) n'empêchent pas les autres.
  Compte rendu : « 8 saisies créées, 2 refusées », avec pour chaque refus le jour, la tâche et le
  message de l'API. La page est rafraîchie.
- Règles revérifiées côté serveur par l'action (semaine vide, jours vides) : un double clic ou un
  autre onglet ne crée pas de doublons.

## 4. Accès à l'API et code

- `src/lib/api/saisies.ts` : `listerSaisies(utilisateurId, du, au)` (toutes les pages),
  `creerSaisie`, `modifierSaisie`, `supprimerSaisie` ; `src/lib/api/clotures.ts` :
  `listerCloturesDuMois(mois)` (toutes les pages).
- `src/lib/saisies/` : semaine (lecture de l'URL, lundi, jours, semaine précédente / suivante),
  calcul de la grille et des totaux (fonctions pures, testées), schéma, Server Actions.
- Libellés : projets et tâches visibles lus en entier (`lireToutesLesPages`), associés aux
  identifiants des saisies (une tâche désactivée garde son libellé).
- Constantes : durée minimale, maximale, pas, maximum journalier, longueur du commentaire.

## 5. Documentation

- `README.md` (section front) : saisie des temps ; `web/CLAUDE.md` si une convention change.
- `front-end-socle.md` : lot F4b (équipe et clôtures) dans la feuille de route ; ce plan : état.
- PR `feat(web): saisir ses temps à la semaine`, fusion en squash après `web:review`.

## Tests (Vitest ; cas accepté et cas refusé)

- Semaine : lundi d'une date, valeurs invalides → semaine en cours, semaine précédente / suivante,
  passage d'année, jours de week-end affichés seulement s'ils ont des saisies.
- Grille : cumuls par tâche et par jour, total de la semaine, plusieurs saisies d'une même case.
- Mois clôturés : saisie en lecture seule, jour grisé.
- Schéma : durées admises (0,5, 7,5, 24) et refusées (0, 0,25, 24,5), commentaire trop long.
- Server Actions : création (sans `utilisateurId` envoyé : l'API prend l'appelant), modification
  avec version, suppression, 409 → conflit, 422 → erreur avec le message de l'API.
- Composants : grille et liste, dialogue (projets filtrés, tâches du projet choisi, aide du cumul),
  états particuliers (sans fiche, sans projet), navigation et choix d'une semaine.
- Recopies : saisies à créer calculées (semaine précédente → semaine affichée, lundi → jours vides
  du mardi au vendredi, week-end exclu), boutons proposés ou non selon la semaine, refus partiels
  (créées / refusées avec message), action refusée si la semaine n'est plus vide.

## Hors périmètre

- Saisies de l'équipe d'un projet, clôture et réouverture des mois (lot F4b).
- Saisie pour un autre utilisateur, export, création groupée « tout ou rien » (appel groupé de l'API).
