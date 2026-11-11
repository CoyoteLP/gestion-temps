/**
 * Messages affichés sur la page de connexion selon le code `error` qu'y passe Auth.js. Auth.js ne
 * transmet que des codes génériques : `Configuration` regroupe toute erreur côté serveur
 * (fournisseur injoignable, vérification PKCE ou `state` expirée, configuration incorrecte).
 */
const MESSAGES_ERREUR_CONNEXION: Record<string, string> = {
	Configuration: "Le service de connexion ne répond pas. Réessayez dans quelques instants.",
	AccessDenied: "L'accès vous a été refusé.",
}

const MESSAGE_ERREUR_CONNEXION_PAR_DEFAUT = "La connexion a échoué. Veuillez réessayer."

/**
 * @param code paramètre `error` de la page de connexion
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
