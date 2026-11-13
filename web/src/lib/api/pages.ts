import type { PageResponse } from "./types"

/**
 * Lit une liste paginée en entier, page après page, pour une liste courte par nature (membres d'un
 * projet, utilisateurs proposés dans un choix). À ne pas utiliser pour une liste affichée : elle
 * reste paginée.
 *
 * @param lirePage lecture d'une page, numérotée à partir de 1
 * @returns tous les éléments, dans l'ordre de l'API
 * @throws ApiError si une lecture échoue
 */
export async function lireToutesLesPages<T>(
	lirePage: (page: number) => Promise<PageResponse<T>>,
): Promise<T[]> {
	const elements: T[] = []
	for (let page = 1; ; page++) {
		const resultat = await lirePage(page)
		elements.push(...resultat.contenu)
		if (page >= resultat.pages || resultat.contenu.length === 0) {
			return elements
		}
	}
}
