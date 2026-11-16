/**
 * Numéro de page lu dans l'URL (`?page=2`). Une valeur absente ou invalide donne la première page,
 * plutôt qu'une erreur de validation de l'API.
 *
 * @param valeur paramètre `page` de l'URL
 * @returns un entier supérieur ou égal à 1
 */
export function lirePage(valeur: string | string[] | undefined): number {
	const texte = Array.isArray(valeur) ? valeur[0] : valeur
	if (!texte || !/^\d{1,9}$/.test(texte)) {
		return 1
	}
	return Math.max(1, Number(texte))
}
