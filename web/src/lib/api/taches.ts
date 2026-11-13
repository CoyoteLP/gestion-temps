import "server-only"

import { TAILLE_PAGE } from "@/lib/constantes"

import { apiFetch } from "./client"
import type { Tache, TacheRequest } from "./modeles"
import type { PageResponse } from "./types"

const CHEMIN_TACHES = "/api/taches"

/**
 * @param projetId projet dont on lit les tâches
 * @param page     numéro de page, à partir de 1
 * @returns une page de tâches du projet, triées par l'API
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerTaches(projetId: number, page: number): Promise<PageResponse<Tache>> {
	return apiFetch<PageResponse<Tache>>(CHEMIN_TACHES, {
		parametres: { projetId, page, taille: TAILLE_PAGE },
	})
}

/**
 * @param tache tâche à créer (sans version)
 * @returns la tâche créée
 * @throws ApiError 404 si le projet n'existe pas, 400 si la tâche est invalide
 */
export function creerTache(tache: TacheRequest): Promise<Tache> {
	return apiFetch<Tache>(CHEMIN_TACHES, { methode: "POST", corps: tache })
}

/**
 * @param id    identifiant de la tâche
 * @param tache nouvelles valeurs, avec la version lue
 * @returns la tâche modifiée, avec sa nouvelle version
 * @throws ApiError 409 si la tâche a été modifiée entre-temps
 */
export function modifierTache(id: number, tache: TacheRequest): Promise<Tache> {
	return apiFetch<Tache>(`${CHEMIN_TACHES}/${id}`, { methode: "PUT", corps: tache })
}

/**
 * @param id identifiant de la tâche
 * @throws ApiError 409 si la tâche a des saisies de temps (la désactiver à la place)
 */
export async function supprimerTache(id: number): Promise<void> {
	await apiFetch<null>(`${CHEMIN_TACHES}/${id}`, { methode: "DELETE" })
}
