# Plan : lot F3c — réinitialiser le rattachement d'un compte, et rôle de l'utilisateur dans ses projets

> **État (2026-11-14)** : plan validé (une seule PR ; 200 sans effet pour une fiche non rattachée ;
> `rattache` dans toutes les réponses utilisateur) et implémenté sur `feature/rattachement-et-mon-role` ;
> `./mvnw verify` (374 tests) et `web/` (375 tests, build) verts ; `/review` et `web:review` faites,
> contrôle d'accès de la fiche projet centralisé (`AccesProjetService.roleVerifie`) ; parcours de bout
> en bout validé. Liste des projets : 4 requêtes SQL quel que soit le nombre de projets (rôles lus en
> une seule requête).

Lot backend et front, décidé le 2026-11-14 pendant la vérification de F3 (feuille de route :
[`front-end-socle.md`](front-end-socle.md)). Deux petites évolutions indépendantes, regroupées.

## 1. Réinitialiser le rattachement d'un compte (backend)

**Constat** : une fiche est rattachée à un compte du fournisseur (`utilisateur.sujet` = revendication
`sub`). Elle n'est jamais reprise par un autre compte, même avec le même email vérifié (protection
contre l'usurpation). Si le compte est supprimé puis recréé chez le fournisseur (ou si le royaume est
réimporté), l'utilisateur reste bloqué sur « Inscription à finaliser » ; seul un accès à la base le
débloque (cas de `pmartin` en dev).

**Évolution** :
- `DELETE /api/utilisateurs/{id}/rattachement` (administrateur ; la règle par défaut de
  `SecurityConfig` réserve déjà toute écriture à l'administrateur) : vide `sujet`. À la connexion
  suivante, la fiche est reprise par le compte qui présente le même email **vérifié**, comme une
  fiche créée par l'administrateur. Réponse 200, `data: null`, message « Le rattachement du compte a
  été réinitialisé ».
- Fiche sans rattachement : 200 aussi (opération idempotente, rien à faire) ; fiche inconnue : 404.
- La modification passe par l'entité (et non par une requête `update`) : `version` incrémentée et
  audit renseigné (`modifie_par` = l'administrateur), pour garder la trace de l'opération.
  Journal : niveau INFO, identifiant de la fiche seulement (jamais l'email).
- `UtilisateurResponse` gagne `rattache` (booléen : la fiche est rattachée à un compte), pour que le
  front n'affiche l'action que lorsqu'elle sert. Le `sub` lui-même n'est pas exposé.
- Pas de migration : la colonne existe.

## 2. Rôle de l'utilisateur dans ses projets (backend)

- `ProjetResponse` gagne `monRole` (avant `audit`) : rôle de l'appelant dans le projet
  (`MANAGER`, `BACKUP`, `CONTRIBUTEUR`), `null` s'il n'en est pas membre (cas d'un administrateur,
  ou d'un administrateur sans fiche).
- Calcul dans `ProjetService`, pour toutes les réponses projet (liste, détail, création,
  modification) : liste → **une seule requête** pour la page (`MembreProjetRepository` :
  `findByUtilisateurIdAndProjetIdIn`), détail → une requête. Pas de requête supplémentaire pour un
  administrateur sans fiche.
- `ProjetResponse.from(Projet)` reste (sans rôle) ; nouvelle fabrique `from(Projet, RoleProjet)`.

## 3. Front

- `npm run api:types` ; `monRole` (nullable) dans le modèle `Projet`, `rattache` dans `Utilisateur`.
- **Liste des projets** : colonne « Mon rôle » (Responsable, Suppléant, Contributeur ; vide si non
  membre), masquée sur mobile comme la période.
- **Fiche projet** : ligne « Mon rôle » dans le détail, seulement si l'utilisateur est membre.
- **Écran Utilisateurs** : pour une fiche rattachée, bouton icône « Réinitialiser le rattachement du
  compte de X » (`aria-label`), avec confirmation (`DialogueConfirmation`) : « Le compte de connexion
  de X sera détaché de sa fiche ; elle sera reprise par le prochain compte qui se connectera avec
  l'email X (vérifié par le service de connexion). » Server Action avec identifiant vérifié, puis
  `refresh()`.

## 4. Documentation

- `README.md` : endpoint, champ `rattache`, champ `monRole`, procédure de déblocage (remplace la
  consigne « vider la colonne `sujet` en base de dev »).
- `CLAUDE.md` : partie Sécurité (rattachement réinitialisable par l'administrateur).
- `front-end-socle.md` et ce plan : état.

## Tests (cas accepté et cas refusé)

- `UtilisateurControllerTest` : réinitialisation par l'administrateur (fiche rattachée → `rattache`
  devient faux, version incrémentée, `modifie_par`) ; idempotence ; 404 ; 403 pour un collaborateur ;
  401 sans jeton ; reprise de la fiche par un autre compte de même email vérifié après la
  réinitialisation, et pas avant.
- `ProjetControllerTest` : `monRole` d'un contributeur et d'un responsable (liste et détail),
  `null` pour l'administrateur non membre ; le nombre de requêtes de la liste ne dépend pas du nombre
  de projets (vérifié avec `show-sql` sur une page de plusieurs projets).
- Front : colonne « Mon rôle » (avec et sans rôle), ligne de la fiche, bouton présent seulement
  pour une fiche rattachée, Server Action (identifiant invalide refusé, succès, erreur de l'API).
- `./mvnw verify` et les vérifications de `web/` vertes.

## Points à valider

1. **Une seule PR** pour le backend et le front (`feat(utilisateur): réinitialiser le rattachement
   d'un compte et afficher son rôle dans les projets`), ou deux PR comme F1/F2 ?
2. Réinitialisation d'une fiche sans rattachement : **200 sans effet** (proposé) ou 422 ?
3. `rattache` visible dans toutes les réponses utilisateur (y compris `/moi` de l'utilisateur
   lui-même, où il vaut toujours vrai) : d'accord ?

## Hors périmètre

- Synchronisation de l'email ou du nom entre la fiche et le fournisseur.
- Historique des rattachements (seul l'audit de la fiche garde la dernière modification).
