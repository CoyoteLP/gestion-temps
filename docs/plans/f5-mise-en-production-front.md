# Plan : lot F5 — préparer le front à la production

> **État (2026-11-16)** : plan validé. **F5a** (PR #34) et **F5b** (PR #35) fusionnés. **F5c**
> validé et implémenté sur `feature/f5c-deploiement-front` (non commité) : image construite et
> lancée en local (sondes, redirection, en-têtes, utilisateur `nonroot`, 75 Mo d'application sur
> 204 Mo d'image de base).

Décisions de l'utilisateur (2026-11-16) :
- **quatre PR** : F5a authentification, F5b en-têtes de sécurité, F5c image et guide de déploiement,
  F5d tests E2E Playwright ;
- **Auth.js remplacé** par `openid-client` (6.x, certifié OpenID) et `iron-session` (chiffrement du
  cookie de session) : `next-auth` 5 est toujours en bêta (5.0.0-beta.32, aucune publication depuis
  le 20 juillet 2026), la 4.x stable n'est pas compatible ;
- en production, **seul le front est public** ; l'API n'est joignable que du réseau interne ;
- **Playwright sur la pile complète** (Keycloak, MariaDB, API, front), en local et en CI.

## F5a — Authentification sans Auth.js

Même architecture BFF : Authorization Code + PKCE avec le fournisseur, jetons dans un cookie chiffré
`httpOnly`, jamais exposés au navigateur. Seuls `src/auth.ts`, `src/proxy.ts`, `src/lib/auth/`, la
route de rappel et la page de connexion changent ; les pages et `apiFetch` gardent leurs appels
(`jetonAcces`, `utilisateurCourant`, `exigerAdmin`).

### Parcours
1. **Connexion / inscription** (Server Actions `seConnecter`, `sInscrire`, inchangées pour les
   pages) : `openid-client` construit l'URL d'autorisation (PKCE S256, `state`, `nonce` ;
   `prompt=create` pour l'inscription) ; le vérificateur PKCE, le `state`, le `nonce` et la page de
   retour sont mis dans un cookie chiffré de courte durée (10 min), puis redirection.
2. **Rappel** : route `GET /api/auth/callback/keycloak` (même adresse qu'aujourd'hui : **aucun
   changement dans Keycloak**). `openid-client` échange le code (vérifie `state`, PKCE, `nonce`,
   l'émetteur, l'audience et l'expiration du jeton d'identité), puis :
   création de la fiche à la première connexion (`enregistrerALaConnexion`, non bloquant comme
   aujourd'hui), cookie de session posé, cookie temporaire effacé, retour sur la page demandée
   (`cheminDeRetour`). Échec → `/connexion?erreur=…` avec un message clair.
3. **Session** : nom, email (jeton d'identité), rôle administrateur (jeton d'accès), jetons et leur
   expiration, chiffrés avec `iron-session` (`sealData`/`unsealData`, clé `AUTH_SECRET`).
   Les jetons de Keycloak font environ 3,3 Ko (mesuré sur le Keycloak de dev) : chiffrés, ils
   dépassent la limite de 4 Ko d'un cookie. Le contenu est donc **réparti sur plusieurs cookies**
   (`gestion-temps.session.0`, `.1`…), comme le fait Auth.js aujourd'hui. Cookies `httpOnly`,
   `SameSite=Lax`, `Secure` en HTTPS, préfixe `__Secure-` en HTTPS. Durée : celle de la session
   Keycloak (le cookie disparaît quand le renouvellement échoue).
4. **Renouvellement à un seul endroit** (correction du point relevé au lot F0) : le proxy renouvelle
   le jeton qui expire, écrit les nouveaux cookies dans la réponse **et** dans la requête transmise
   à la page (`NextResponse.next({ request: { headers } })`) : la page lit directement le jeton
   neuf, `jetonAcces` ne renouvelle plus. Seule exception, la Server Action « Finaliser mon
   inscription » (`jetonAccesRenouvele`), qui force un renouvellement et réécrit le cookie.
5. **Protection des pages** (proxy, même `matcher`) : sans session valide, redirection vers
   `/connexion?retour=/chemin` (chemin relatif, plus d'URL absolue `callbackUrl` à nettoyer).
6. **Déconnexion** : inchangée (cookies effacés, puis déconnexion chez le fournisseur avec
   `id_token_hint`, construite par `openid-client`).

### Code
- Supprimés : `next-auth`, `src/auth.ts`, `src/types/next-auth.d.ts`, route `[...nextauth]`.
- `lib/auth/oidc.ts` : configuration `openid-client` (découverte mise en cache par processus, client
  public ou confidentiel selon `AUTH_KEYCLOAK_SECRET`).
- `lib/auth/cookie-session.ts` : chiffrement, découpage et lecture des cookies de session et du
  cookie temporaire de connexion.
- `lib/auth/jeton.ts` : renouvellement via `refreshTokenGrant` ; `rolesDuJeton`,
  `estAdministrateur`, `expirationProche` inchangés.
- `lib/auth/session.ts` : `jetonAcces`, `utilisateurCourant`, `exigerAdmin`, `jetonAccesRenouvele`
  sur la nouvelle session (mêmes signatures).
- `src/proxy.ts` : vérification de la session, renouvellement, redirection.
- `app/api/auth/callback/keycloak/route.ts` : rappel.
- Page de connexion : paramètres `retour` et `erreur` (codes propres à l'application).

### Variables d'environnement
Renommées comme celles de l'API (décision du 2026-11-16) : `SESSION_SECRET` (au moins 32
caractères, exigence d'`iron-session`), `OIDC_ISSUER_URI`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`,
`OIDC_ROLES_CLAIM`, et `APP_URL` (adresse publique). **`APP_URL` est obligatoire en production** :
l'origine n'y est jamais déduite des en-têtes `Host` / `X-Forwarded-*` (revue de F5a).

### Tests
- Unitaires : construction de l'URL d'autorisation (PKCE, `state`, `prompt=create`), rappel (succès,
  `state` incorrect, cookie temporaire absent ou expiré, refus du fournisseur, échec de la création
  de fiche non bloquant), découpage et relecture des cookies (taille, cookie altéré ignoré),
  renouvellement dans le proxy (jeton neuf transmis à la page, un seul appel au fournisseur, échec
  → redirection), `jetonAccesRenouvele`, déconnexion, redirection vers `/connexion?retour=`.
- Bout en bout par l'utilisateur : connexion, inscription, finaliser l'inscription, renouvellement
  après expiration du jeton (durée de vie courte sur le Keycloak de dev), déconnexion, compte
  administrateur.

## F5b — En-têtes de sécurité

Décisions de l'utilisateur (2026-11-16) : **CSP à nonce strict** pour les scripts ; **HSTS posé par
le front** en production.

### Politique de sécurité du contenu (CSP)
Un nonce aléatoire par requête, généré par le proxy, posé dans l'en-tête `Content-Security-Policy`
de la réponse **et** de la requête transmise au rendu : Next.js l'applique alors lui-même à ses
scripts (guide Next.js « Content Security Policy »).

```
default-src 'self';
script-src 'self' 'nonce-…' 'strict-dynamic';      (+ 'unsafe-eval' en dev seulement, pour React)
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self' <origine du fournisseur OIDC>;
frame-ancestors 'none';
upgrade-insecure-requests;                          (en HTTPS seulement)
```

- **Scripts** : seuls ceux qui portent le nonce de la requête s'exécutent ; un script injecté (XSS)
  est bloqué.
- **Styles** : `'unsafe-inline'` reste nécessaire (attributs `style` rendus par les composants, dont
  la barre latérale) ; risque bien plus faible que pour les scripts.
- **`form-action`** : l'origine du fournisseur (`OIDC_ISSUER_URI`) y figure, sinon le navigateur
  bloquerait la redirection vers Keycloak d'un formulaire de connexion envoyé sans JavaScript.
- **Rendu à la requête** : un nonce ne peut pas figurer dans une page prérendue au build. Le layout
  racine lit le nonce (`headers()`) et exporte `instant = false` : toutes les pages sont rendues à
  la requête (perte de la coquille prérendue ; sans enjeu de cache, chaque page dépend de
  l'utilisateur connecté).
- **Script du thème** (`next-themes`, évite le flash de couleur) : reçoit le nonce.
- **Proxy** : il s'applique désormais aussi à `/connexion` et au retour du fournisseur (CSP), sans
  y exiger de session ; seuls les fichiers statiques (`_next/static`, `_next/image`, favicon) en
  restent exclus.

### Autres en-têtes
- Fixes, pour toutes les réponses (`next.config.ts`, `headers()`) : `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (anciens
  navigateurs ; `frame-ancestors` pour les autres), `Permissions-Policy` (caméra, micro,
  géolocalisation, paiement, USB désactivés), `Cross-Origin-Opener-Policy: same-origin`.
- **HSTS** (`Strict-Transport-Security: max-age=31536000`, sans `includeSubDomains` ni `preload`) :
  posé par le proxy, à l'exécution, seulement si `APP_URL` est en `https` (jamais en dev). Il ne
  peut pas aller dans `next.config.ts`, évalué au build, avant que `APP_URL` ne soit connue.

### Code et tests
- `lib/securite/en-tetes.ts` : construction de la CSP (nonce, dev, origine du fournisseur), en-tête
  HSTS ; tests unitaires (directives, pas de `'unsafe-inline'` ni `'unsafe-eval'` pour les scripts
  en production, `form-action` avec le fournisseur, HSTS seulement en https).
- `proxy.ts` : nonce et en-têtes sur chaque réponse (redirections comprises) ; tests (CSP présente,
  nonce différent à chaque requête, transmis au rendu, `/connexion` sans redirection).
- Layout racine : `instant = false`, nonce passé au fournisseur de thème.
- En-têtes fixes dans `lib/securite/en-tetes-fixes.ts`, module sans dépendance : `next.config.ts`
  est compilé à part et n'y résout pas l'alias `@/`.
- Réalisé : `/projets/[id]` reste en prérendu partiel (coquille générique du paramètre), mais Next.js
  y applique le nonce à la requête : vérifié sur le HTML servi (42 scripts sur 42 avec le nonce).
- Vérification manuelle sur le build de production : en-têtes présents (`curl -I`), aucune erreur
  CSP dans la console du navigateur sur les pages principales (connexion, saisies, équipe, projets).

## F5c — Image et déploiement

Décisions de l'utilisateur (2026-11-16) : image **distroless Node 22** ; sondes de **vivacité et de
disponibilité** ; image **construite par la CI** (sans publication).

### Image
- `next.config.ts` : `output: "standalone"` (serveur Node autonome, seules les dépendances utiles).
- `web/Dockerfile` en trois étapes, images de base épinglées par empreinte :
  1. dépendances : `node:22.22.0-bookworm-slim`, `npm ci` ;
  2. construction : `npm run build` (aucune variable d'environnement requise au build) ;
  3. exécution : `gcr.io/distroless/nodejs22-debian12:nonroot` (Node 22.22.0, sans shell ni
     gestionnaire de paquets, utilisateur non root), `node server.js`, port 3000.
- `web/.dockerignore` : ni `node_modules`, ni `.next`, ni **aucun fichier `.env*`** (sauf
  `.env.example`), ni tests.
- Construction depuis le tag de la version, comme l'API :
  `docker build -t <registre>/gestion-temps-web:1.1.0 web`.

### Santé
- `GET /api/sante` (vivacité) : 200 `{"statut":"UP"}` tant que le serveur répond.
- `GET /api/sante/disponibilite` : 200 si le front joint l'API et le fournisseur OIDC (document de
  découverte), sinon 503 `{"statut":"DOWN"}` ; délai court (2 s) ; aucun détail technique dans la
  réponse, la cause est journalisée.
- Publiques (sans session), comme `/connexion` dans le proxy ; l'API est jointe par une fonction de
  `lib/api/` (règle : pas de `fetch` direct vers l'API ailleurs).

### CI
- Workflow « Front web » : une étape `docker build` sur les pull requests qui modifient `web/`, sans
  publication ; la publication reste manuelle depuis le tag.

### Guide de déploiement (`docs/DEPLOIEMENT.md`)
- Le guide couvre désormais **l'API et le front** : prérequis, image, variables (`SESSION_SECRET`,
  `OIDC_ISSUER_URI`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ROLES_CLAIM`, `APP_URL`
  **obligatoire**, `API_URL`), santé, arrêt, contrôle avant mise en service.
- **Fournisseur OIDC** : client du front (Authorization Code + PKCE S256, adresse de retour
  `<APP_URL>/api/auth/callback/keycloak`, retour de déconnexion `<APP_URL>/connexion`, portée
  `openid profile email`), jetons qui portent l'**audience de l'API**.
- **Réseau** : seul le front est publié par le reverse proxy HTTPS ; **l'API devient interne**
  (joignable du front seulement), Actuator reste sur le réseau interne.
- **Plusieurs instances du front** : même `SESSION_SECRET` partout ; le changer déconnecte tous
  les utilisateurs (pas d'autre état à partager).
- Mise à jour : le front n'a ni base ni migration ; il se remplace instance par instance.

### Vérifications
- Tests : sondes (API ou fournisseur injoignables → 503 sans détail ; chemins publics dans le
  proxy).
- Image construite et lancée localement (`docker run` avec le Keycloak et l'API de dev) : sondes,
  connexion, utilisateur non root, taille de l'image.
- Réalisé : `public/` est vide et non suivi par Git, il n'est pas copié dans l'image (à ajouter au
  Dockerfile quand il contiendra des fichiers) ; la CI n'a plus besoin de variables factices ni de
  secret pour le build ; elle démarre l'image et interroge `/api/sante`.

## F5d — Tests E2E Playwright (à détailler à son tour)
Pile complète par docker compose de test, parcours clés (connexion, saisie, clôture, droits),
workflow CI dédié, non bloquant au départ.

## Points validés (2026-11-16)
1. Cookie **réparti** sur plusieurs cookies (`iron-session`, option `chunk`).
2. Variables **renommées** (`OIDC_*`, `SESSION_SECRET`, `APP_URL`).
3. Sessions ouvertes avec Auth.js perdues au passage (une nouvelle connexion).
4. Revue : `APP_URL` exigée en production ; `state` incorrect traité comme une connexion à
   recommencer ; révocation des jetons de renouvellement à laisser désactivée dans Keycloak
   (guide de déploiement, § 3).
