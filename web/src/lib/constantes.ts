/** Valeurs partagées du front-end : pas de nombre magique en dur dans les composants. */

/** Rôle administrateur dans la revendication des rôles du jeton (même valeur que l'API). */
export const ROLE_ADMIN = "ADMIN"

/** Revendication du jeton d'accès portant les rôles, par défaut (`OIDC_ROLES_CLAIM`). */
export const REVENDICATION_ROLES_PAR_DEFAUT = "roles"

/** Le jeton d'accès est renouvelé quand il lui reste moins de ce délai de validité (secondes). */
export const MARGE_RENOUVELLEMENT_JETON_SECONDES = 60

/**
 * Nom du cookie de session chiffré (préfixé `__Secure-` en HTTPS). Il porte les jetons : réparti
 * sur plusieurs cookies (`.0`, `.1`…) quand il dépasse la taille d'un cookie.
 */
export const NOM_COOKIE_SESSION = "gestion-temps.session"

/**
 * Durée de vie maximale de la session, en secondes (30 jours). En pratique, elle prend fin plus tôt,
 * quand le fournisseur refuse de renouveler le jeton (session expirée ou fermée chez lui).
 */
export const DUREE_SESSION_SECONDES = 30 * 24 * 60 * 60

/** Nom du cookie chiffré qui garde, pendant la connexion, le vérificateur PKCE et le `state`. */
export const NOM_COOKIE_CONNEXION = "gestion-temps.connexion"

/** Durée de validité d'une connexion en cours chez le fournisseur, en secondes (10 minutes). */
export const DUREE_CONNEXION_SECONDES = 10 * 60

/** Adresse de retour du fournisseur OIDC après la connexion (déclarée dans le client Keycloak). */
export const CHEMIN_RAPPEL_OIDC = "/api/auth/callback/keycloak"

/** Nombre d'éléments par page des listes (l'API accepte 100 au plus). */
export const TAILLE_PAGE = 20

/** Longueur maximale d'un filtre texte de liste (l'API refuse au-delà). */
export const LONGUEUR_MAX_FILTRE = 100

/** Pause de frappe après laquelle un filtre texte de liste est appliqué, en millisecondes. */
export const DELAI_FILTRE_MS = 300

/** Taille de page maximale acceptée par l'API, pour lire une liste en entier en peu d'appels. */
export const TAILLE_PAGE_MAX = 100

/** En-tête de l'identifiant de corrélation, repris par l'API et présent dans ses logs. */
export const EN_TETE_CORRELATION = "X-Correlation-Id"

/** Page de connexion, seule page accessible sans session. */
export const PAGE_CONNEXION = "/connexion"

/** Page affichée après la connexion quand aucune page n'était demandée. */
export const PAGE_ACCUEIL = "/projets"

/** Longueur maximale du nom et du prénom d'un utilisateur (`ProfilRequest` de l'API). */
export const LONGUEUR_MAX_NOM = 100

/** Longueur maximale du code d'un projet (`ProjetRequest`). */
export const LONGUEUR_MAX_CODE_PROJET = 20

/** Longueur maximale du nom d'un projet (`ProjetRequest`). */
export const LONGUEUR_MAX_NOM_PROJET = 100

/** Longueur maximale du libellé d'une tâche (`TacheRequest`). */
export const LONGUEUR_MAX_LIBELLE_TACHE = 100

/** Longueur maximale de la description d'un projet ou d'une tâche. */
export const LONGUEUR_MAX_DESCRIPTION = 1000

/**
 * Paramètre OIDC `prompt` qui ouvre directement le formulaire d'inscription du fournisseur
 * (standard « Initiating User Registration », pris en charge par Keycloak).
 */
export const PROMPT_INSCRIPTION = "create"

/** Console de compte du fournisseur (mot de passe, email), relative à `OIDC_ISSUER_URI`. */
export const CHEMIN_CONSOLE_COMPTE = "/account"

/** Fuseau horaire de référence pour la date du jour (même valeur que l'API). */
export const FUSEAU_HORAIRE = "Europe/Paris"

/** Durée minimale d'une saisie, en heures (`Constantes.DUREE_MIN_SAISIE` de l'API). */
export const DUREE_MIN_SAISIE = 0.5

/** Durée maximale d'une saisie, en heures. */
export const DUREE_MAX_SAISIE = 24

/** Pas de la durée d'une saisie, en heures. */
export const PAS_DUREE_SAISIE = 0.5

/** Total maximal des saisies d'une journée, en heures. */
export const MAX_HEURES_JOUR = 24

/** Durée d'une journée au-delà de laquelle le front avertit, sans bloquer (l'API refuse à 24 h). */
export const SEUIL_ALERTE_HEURES_JOUR = 8

/** Longueur maximale du commentaire d'une saisie. */
export const LONGUEUR_MAX_COMMENTAIRE = 500

/** Durée d'affichage d'un message de confirmation (toast), en millisecondes. */
export const DUREE_MESSAGE_SUCCES_MS = 10_000
