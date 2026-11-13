import "server-only"

import { TAILLE_PAGE_MAX } from "@/lib/constantes"

import { apiFetch } from "./client"
import type { MembreProjet, MembreProjetRequest } from "./modeles"
import { lireToutesLesPages } from "./pages"
import type { PageResponse } from "./types"

const cheminMembres = (projetId: number) => `/api/projets/${projetId}/membres`

/**
 * Tous les membres d'un projet (quelques personnes : la liste n'est pas paginée à l'écran).
 *
 * @param projetId identifiant du projet
 * @returns les membres, triés par l'API
 * @throws ApiError 404 si le projet n'existe pas
 */
export function listerTousLesMembres(projetId: number): Promise<MembreProjet[]> {
	return lireToutesLesPages((page) =>
		apiFetch<PageResponse<MembreProjet>>(cheminMembres(projetId), {
			parametres: { page, taille: TAILLE_PAGE_MAX },
		}),
	)
}

/**
 * @param projetId identifiant du projet
 * @param membre   utilisateur et rôle (sans version)
 * @returns le membre ajouté
 * @throws ApiError 409 si l'utilisateur est déjà membre du projet
 */
export function ajouterMembre(projetId: number, membre: MembreProjetRequest): Promise<MembreProjet> {
	return apiFetch<MembreProjet>(cheminMembres(projetId), { methode: "POST", corps: membre })
}

/**
 * @param projetId identifiant du projet
 * @param id       identifiant du membre
 * @param membre   utilisateur et rôle, avec la version lue
 * @returns le membre modifié
 * @throws ApiError 409 si le membre a été modifié entre-temps
 */
export function modifierMembre(
	projetId: number,
	id: number,
	membre: MembreProjetRequest,
): Promise<MembreProjet> {
	return apiFetch<MembreProjet>(`${cheminMembres(projetId)}/${id}`, { methode: "PUT", corps: membre })
}

/**
 * @param projetId identifiant du projet
 * @param id       identifiant du membre
 * @throws ApiError 404 si le membre n'existe pas dans ce projet
 */
export async function retirerMembre(projetId: number, id: number): Promise<void> {
	await apiFetch<null>(`${cheminMembres(projetId)}/${id}`, { methode: "DELETE" })
}
