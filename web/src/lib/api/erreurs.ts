/** Statut retenu quand l'API n'a pas pu être jointe (aucune réponse HTTP). */
export const STATUT_API_INJOIGNABLE = 503

const MESSAGES_PAR_DEFAUT: Record<number, string> = {
	400: "La requête est invalide.",
	401: "Votre session a expiré : reconnectez-vous.",
	403: "Vous n'avez pas les droits nécessaires pour cette action.",
	404: "La ressource demandée est introuvable.",
	409: "La ressource a été modifiée entre-temps : rechargez-la avant de recommencer.",
	422: "L'opération enfreint une règle de gestion.",
	[STATUT_API_INJOIGNABLE]: "Le service est momentanément indisponible. Réessayez dans quelques instants.",
}

const MESSAGE_INCONNU = "Une erreur inattendue s'est produite. Réessayez plus tard."

/**
 * @param statut code HTTP de la réponse
 * @returns un message en français pour une réponse d'erreur sans message exploitable
 */
export function messageParDefaut(statut: number): string {
	return MESSAGES_PAR_DEFAUT[statut] ?? MESSAGE_INCONNU
}

/**
 * Erreur renvoyée par l'API (ou API injoignable). Le message est celui de l'API, déjà en français
 * et destiné à l'utilisateur, ou à défaut un message générique selon le statut.
 */
export class ApiError extends Error {
	/**
	 * @param statut                 code HTTP ({@link STATUT_API_INJOIGNABLE} si aucune réponse)
	 * @param message                message affichable
	 * @param identifiantCorrelation identifiant de la requête, présent dans les logs de l'API
	 */
	constructor(
		readonly statut: number,
		message: string,
		readonly identifiantCorrelation: string,
	) {
		super(message)
		this.name = "ApiError"
	}
}

/**
 * Attend une lecture de l'API sans lever d'exception pour une erreur de l'API, que le composant
 * affiche alors (`AlerteErreur`).
 *
 * @param lecture appel à l'API en cours
 * @returns la valeur lue, ou l'erreur de l'API
 * @throws toute autre erreur (erreur de programmation, redirection de Next.js)
 */
export async function valeurOuErreurApi<T>(lecture: Promise<T>): Promise<T | ApiError> {
	try {
		return await lecture
	} catch (erreur) {
		if (erreur instanceof ApiError) {
			return erreur
		}
		throw erreur
	}
}
