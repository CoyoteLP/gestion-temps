/** Valeurs partagées du front-end : pas de nombre magique en dur dans les composants. */

/** Rôle administrateur dans la revendication des rôles du jeton (même valeur que l'API). */
export const ROLE_ADMIN = "ADMIN"

/** Revendication du jeton d'accès portant les rôles, par défaut (`AUTH_ROLES_CLAIM`). */
export const REVENDICATION_ROLES_PAR_DEFAUT = "roles"

/** Le jeton d'accès est renouvelé quand il lui reste moins de ce délai de validité (secondes). */
export const MARGE_RENOUVELLEMENT_JETON_SECONDES = 60

/** Nombre d'éléments par page des listes (l'API accepte 100 au plus). */
export const TAILLE_PAGE = 20

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

/** Console de compte du fournisseur (mot de passe, email), relative à `AUTH_KEYCLOAK_ISSUER`. */
export const CHEMIN_CONSOLE_COMPTE = "/account"

/** Durée d'affichage d'un message de confirmation (toast), en millisecondes. */
export const DUREE_MESSAGE_SUCCES_MS = 10_000
