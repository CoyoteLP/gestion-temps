/** Enveloppe de toutes les réponses de l'API, succès comme erreur. */
export type ApiResponse<T> = {
	status: "success" | "error"
	data: T | null
	message: string | null
}

/** Page d'une liste paginée (`data` des listes de l'API). Les pages commencent à 1. */
export type PageResponse<T> = {
	contenu: T[]
	page: number
	taille: number
	total: number
	pages: number
}
