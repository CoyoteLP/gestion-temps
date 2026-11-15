import "server-only"

import { TAILLE_PAGE_MAX } from "@/lib/constantes"
import { type EtatListe, versActif } from "@/lib/listes/etat-liste"

import { apiFetch } from "./client"
import type { Tache, TacheRequest } from "./modeles"
import { lireToutesLesPages } from "./pages"
import { parametresTri } from "./parametres-liste"
import type { PageResponse } from "./types"

const CHEMIN_TACHES = "/api/taches"

/**
 * @param projetId projet dont on lit les tâches
 * @param etat     page, tri et filtres de la liste (libellé, statut)
 * @returns une page de tâches du projet, triées et filtrées par l'API
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerTaches(projetId: number, etat: EtatListe): Promise<PageResponse<Tache>> {
	return apiFetch<PageResponse<Tache>>(CHEMIN_TACHES, {
		parametres: {
			projetId,
			...parametresTri(etat),
			libelle: etat.filtres.libelle,
			actif: versActif(etat.filtres.actif),
		},
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

/**
 * Toutes les tâches visibles par l'utilisateur (celles des projets dont il est membre), actives ou
 * non : pour le choix d'une tâche et les libellés des saisies.
 *
 * @returns les tâches, triées par l'API
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerToutesLesTaches(): Promise<Tache[]> {
	return lireToutesLesPages((page) =>
		apiFetch<PageResponse<Tache>>(CHEMIN_TACHES, { parametres: { page, taille: TAILLE_PAGE_MAX } }),
	)
}

/**
 * Toutes les tâches d'un projet, actives ou non : pour les libellés de ses saisies.
 *
 * @param projetId identifiant du projet
 * @returns les tâches du projet, triées par l'API
 * @throws ApiError 403 si l'appelant n'est pas membre du projet
 */
export function listerToutesLesTachesDuProjet(projetId: number): Promise<Tache[]> {
	return lireToutesLesPages((page) =>
		apiFetch<PageResponse<Tache>>(CHEMIN_TACHES, {
			parametres: { projetId, page, taille: TAILLE_PAGE_MAX },
		}),
	)
}
