/** Valeurs partagées du front-end : pas de nombre magique en dur dans les composants. */

/** Rôle administrateur dans la revendication des rôles du jeton (même valeur que l'API). */
export const ROLE_ADMIN = "ADMIN"

/** Revendication du jeton d'accès portant les rôles, par défaut (`AUTH_ROLES_CLAIM`). */
export const REVENDICATION_ROLES_PAR_DEFAUT = "roles"

/** Le jeton d'accès est renouvelé quand il lui reste moins de ce délai de validité (secondes). */
export const MARGE_RENOUVELLEMENT_JETON_SECONDES = 60

/** Nombre d'éléments par page des listes (l'API accepte 100 au plus). */
export const TAILLE_PAGE = 20

/** En-tête de l'identifiant de corrélation, repris par l'API et présent dans ses logs. */
export const EN_TETE_CORRELATION = "X-Correlation-Id"

/** Page de connexion, seule page accessible sans session. */
export const PAGE_CONNEXION = "/connexion"

/** Page affichée après la connexion quand aucune page n'était demandée. */
export const PAGE_ACCUEIL = "/projets"
