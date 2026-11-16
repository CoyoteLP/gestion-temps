/**
 * Identifiant lu dans l'URL (`/projets/12`). Une valeur invalide donne null : la page affiche
 * alors « introuvable » plutôt qu'une erreur de validation de l'API.
 *
 * @param valeur segment de l'URL
 * @returns un entier strictement positif, ou null
 */
export function lireIdentifiant(valeur: string | undefined): number | null {
	if (!valeur || !/^\d{1,15}$/.test(valeur)) {
		return null
	}
	const identifiant = Number(valeur)
	return identifiant > 0 && Number.isSafeInteger(identifiant) ? identifiant : null
}
