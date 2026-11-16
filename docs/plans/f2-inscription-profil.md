# Plan : lot F2 — inscription, compte en attente et page Profil

> **État (2026-11-12)** : implémenté sur `feature/inscription-profil` ; lint, format, types,
> 159 tests Vitest et build verts ; `web:review` faite et corrigée ; parcours de bout en bout vérifié
> (inscription directe, email vérifié puis « Finaliser mon inscription », activation, profil).
> Keycloak de dev passé en 26.6.4 pour `prompt=create`.

Premier lot d'écrans métier du front-end (`web/`), suite du plan
[`front-end-socle.md`](front-end-socle.md) et du lot backend [F1](f1-utilisateur-moi.md)
(`/api/utilisateurs/moi`). Aucun code Java ne change.

## Contexte

Depuis F1, un compte Keycloak sans fiche `Utilisateur` active reçoit 403 sur toute l'API, sauf
`/api/utilisateurs/moi` :

- `GET /moi` : sa fiche (`actif: false` = en attente de validation), 404 sans fiche ;
- `POST /moi` : crée la fiche **inactive** depuis le jeton ; 409 si elle existe déjà, 422 si l'email
  n'est pas vérifié ou si le nom ou le prénom manquent ;
- `PUT /moi` : nom et prénom (`ProfilRequest { nom, prenom, version }`), 409 si version périmée.

Le front ne connaît pas encore ces endpoints : la page de connexion n'a qu'un bouton « Se
connecter », la page Profil lit le nom et l'email dans le jeton, et un inscrit non validé voit les
pages Projets et Saisies en erreur 403.

Décisions prises avec vous (2026-11-12) :

| Sujet | Décision |
|---|---|
| Création de la fiche | **À la connexion**, côté serveur : `POST /moi` juste après la connexion Keycloak ; « déjà enregistré » (409) est normal. Un échec (email non vérifié…) ne bloque pas la connexion : la page « compte en attente » donne la raison et un bouton pour réessayer. |
| Compte sans fiche active | **Encadré dédié** à la place des pages Projets et Saisies (et des suivantes), avec Profil et Déconnexion accessibles. |
| Administrateur sans fiche | **Rien** : pas de `POST /moi`, pas d'encadré ; sa page Profil indique qu'il n'a pas de fiche. |

## 1. Inscription depuis la page de connexion

- Bouton secondaire **« Créer un compte »** sous « Se connecter » : même Server Action que la
  connexion, avec le paramètre OIDC standard `prompt=create` : Keycloak 26.1 ou plus récent ouvre
  alors directement son formulaire d'inscription (prénom, nom, email, mot de passe). Au retour,
  l'utilisateur est connecté. Le Keycloak de dev passe de 26.0.7 (qui ignore ce paramètre) à 26.6.4.
- Si l'inscription est fermée chez le fournisseur, Keycloak affiche sa page de connexion
  normale : aucun cas particulier côté front.

## 2. Enregistrement de la fiche à la connexion

- Dans Auth.js, à la connexion (événement `signIn`, qui reçoit le jeton d'accès tout neuf) : si
  l'utilisateur n'est pas administrateur, `POST /api/utilisateurs/moi`.
  - 201 : fiche créée (inactive) ; 409 : fiche déjà là. Rien d'autre à faire.
  - 422 (email non vérifié, identité incomplète), API injoignable ou autre erreur : journalisé
    côté serveur (statut et identifiant de corrélation, jamais l'email), la connexion continue.
- `apiFetch` accepte un jeton explicite (option `jeton`) : à cet instant, le cookie de session
  n'est pas encore écrit. C'est le seul appel qui l'utilise.

## 3. Compte en attente

- Nouveau groupe de routes `src/app/(app)/(compte-actif)/` qui contient `projets/` et `saisies/`
  (les URL ne changent pas). Son `layout.tsx` vérifie le compte avant d'afficher la page :
  - administrateur, ou fiche active : la page s'affiche ;
  - fiche inactive : encadré **« Compte en attente de validation »** (un administrateur doit
    l'activer ; rien à faire de votre côté) ;
  - pas de fiche : encadré **« Inscription à finaliser »** avec le bouton « Finaliser mon
    inscription » (Server Action `POST /moi`) ; en cas de refus, le message de l'API est affiché
    tel quel (ex. « Votre adresse email doit être vérifiée… »). L'action renouvelle d'abord le
    jeton (`jetonAccesRenouvele`, enregistré dans la session par `unstable_update`) : celui de la
    connexion porte encore `email_verified: false` si l'email a été vérifié depuis.
- `/profil` reste hors de ce groupe : toujours accessible.
- La vérification lit `GET /moi` une fois par requête (`cache` de React, partagé avec le menu
  utilisateur et la page Profil). Une API injoignable affiche l'erreur habituelle (`AlerteErreur`).
- Les liens de la barre latérale ne changent pas. Une fois le compte activé, un rechargement suffit.

## 4. Page Profil

- **Identité** (fiche de l'API, `GET /moi`) : formulaire **nom** et **prénom** (react-hook-form +
  zod, mêmes bornes que `ProfilRequest` : obligatoires, 100 caractères au plus), email en lecture
  seule, statut (« Actif » / « En attente de validation »), rôle (lu dans la session).
  - Enregistrement par Server Action `PUT /moi` avec la `version` lue ; succès : toast
    « Les modifications ont été correctement réalisées. » (10 secondes) et page rafraîchie ;
  - 409 (modifié ailleurs) : message et bouton « Recharger » ; 400 : erreurs sous les champs ;
    autres erreurs : `AlerteErreur` avec l'identifiant de corrélation.
- Sans fiche : administrateur → « Aucune fiche utilisateur n'est associée à votre compte
  administrateur » ; autre utilisateur → l'encadré « Inscription à finaliser ».
- **Compte de connexion** : lien « Gérer mon compte de connexion » vers la console de compte du
  fournisseur (`AUTH_KEYCLOAK_ISSUER` + `/account`) pour le mot de passe et l'email. Le nom et le
  prénom modifiés ici ne sont pas recopiés dans Keycloak (hors périmètre, comme la synchronisation
  de l'email en F1).
- **Menu utilisateur** : affiche le prénom et le nom de la fiche quand elle existe (sinon ceux du
  jeton, comme aujourd'hui), pour refléter une modification faite sur la page Profil.

## 5. Accès à l'API et types

- `npm run api:types` (API de dev lancée) pour régénérer `schema.d.ts` avec `/moi` et
  `ProfilRequest` ; type `Utilisateur` dans `modeles.ts`.
- `src/lib/api/utilisateurs.ts` : `lireMonCompte()` (null si 404), `enregistrerMonCompte()`,
  `modifierMonProfil(profil)`.
- Server Actions dans `src/lib/compte/actions.ts` ; elles renvoient un état
  (`succès | erreur | conflit`, message, erreurs par champ) que le formulaire affiche.

## 6. Documentation

- `web/CLAUDE.md` : groupe `(compte-actif)` (toute nouvelle page qui appelle l'API y va),
  option `jeton` d'`apiFetch` réservée à la connexion, schéma de formulaire et Server Action.
- `README.md` (section Front-end web) : parcours d'inscription en dev (créer un compte, cocher
  « Email verified » dans la console Keycloak, se reconnecter ou « Finaliser mon inscription »,
  activation par l'administrateur).
- `front-end-socle.md` : état des lots ; ce plan : état final.
- PR `feat(web): ajouter l'inscription et la page profil`, fusion en squash après `web:review`.

## Tests (Vitest ; cas accepté et cas refusé pour chaque règle)

- `utilisateurs.ts` : `lireMonCompte` renvoie la fiche, null sur 404, lève sur 403 ou 503 ;
  `modifierMonProfil` envoie `PUT` avec la version.
- Enregistrement à la connexion : `POST` pour un non-administrateur ; rien pour un
  administrateur ; 409 silencieux ; 422 et API injoignable journalisés sans bloquer ni
  journaliser l'email.
- `apiFetch` : jeton explicite utilisé à la place de la session.
- Schéma du profil : valeurs valides acceptées ; vide, blancs seuls, plus de 100 caractères refusés.
- Server Actions : succès, 409 → `conflit`, 400 → erreurs par champ, autre → `erreur`.
- Composants : encadrés « en attente » et « à finaliser » (bouton présent ou non) ; formulaire de
  profil (erreurs affichées, bouton désactivé pendant l'envoi, conflit avec « Recharger ») ;
  page de connexion (deux boutons, `prompt=create` pour l'inscription).

## Vérification

- Dans `web/` : `lint`, `format:check`, `typecheck`, `test`, `build` verts ; workflow « Front web »
  vert sur la PR. `./mvnw verify` inchangé (aucun code Java modifié).
- De bout en bout avec le Keycloak de dev et l'API :
  1. « Créer un compte » ouvre l'inscription Keycloak ; après envoi, retour connecté ;
  2. email non vérifié : Projets affiche « Inscription à finaliser », le bouton répond « email à
     vérifier » ;
  3. « Email verified » coché dans la console, « Finaliser mon inscription » : « Compte en attente
     de validation » ;
  4. activation par `admin` (`PUT /api/utilisateurs/{id}`, jusqu'à l'écran de F3) puis
     rechargement : Projets s'affiche ;
  5. Profil : modification du nom, visible dans le menu ; modification concurrente → 409 et
     « Recharger » ;
  6. `admin` (sans fiche) : aucun encadré, Profil indique l'absence de fiche ;
  7. `jdupont` (fiche créée par l'administrateur) : aucun changement de parcours.

## Hors périmètre

- Validation des comptes en attente par l'administrateur (liste `?actif=false`, activation) :
  écran du lot F3.
- Synchronisation du nom ou de l'email entre la fiche et Keycloak.
- Tests E2E Playwright : lot F5.
