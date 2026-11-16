/**
 * Codes d'erreur passés à la page de connexion (`/connexion?erreur=…`) par la connexion et le
 * retour du fournisseur. Aucun détail technique dans l'URL : un code, traduit en message ici.
 */
export const CODES_ERREUR_CONNEXION = {
	/** Fournisseur injoignable, configuration incorrecte, échange du code refusé. */
	fournisseur: "fournisseur",
	/** Connexion en cours introuvable ou expirée (plus de 10 minutes, autre navigateur, `state` faux). */
	expiree: "expiree",
	/** L'utilisateur ou le fournisseur a refusé l'accès. */
	refus: "refus",
} as const

const MESSAGES_ERREUR_CONNEXION: Record<string, string> = {
	[CODES_ERREUR_CONNEXION.fournisseur]:
		"Le service de connexion ne répond pas. Réessayez dans quelques instants.",
	[CODES_ERREUR_CONNEXION.expiree]: "La connexion a expiré ou a été interrompue. Veuillez recommencer.",
	[CODES_ERREUR_CONNEXION.refus]: "L'accès vous a été refusé.",
}

const MESSAGE_ERREUR_CONNEXION_PAR_DEFAUT = "La connexion a échoué. Veuillez réessayer."

/**
 * @param code paramètre `erreur` de la page de connexion
 * @returns le message à afficher, ou null s'il n'y a pas d'erreur
 */
export function messageErreurConnexion(code: string | string[] | undefined): string | null {
	const valeur = Array.isArray(code) ? code[0] : code
	if (!valeur) {
		return null
	}
	return Object.hasOwn(MESSAGES_ERREUR_CONNEXION, valeur)
		? MESSAGES_ERREUR_CONNEXION[valeur]
		: MESSAGE_ERREUR_CONNEXION_PAR_DEFAUT
}
