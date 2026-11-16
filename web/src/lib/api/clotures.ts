import "server-only"

import { TAILLE_PAGE, TAILLE_PAGE_MAX } from "@/lib/constantes"

import { apiFetch } from "./client"
import type { Cloture } from "./modeles"
import { lireToutesLesPages } from "./pages"
import type { PageResponse } from "./types"

const CHEMIN_CLOTURES = "/api/clotures"

/**
 * Clôtures d'un mois, pour les projets visibles par l'utilisateur (tous pour un administrateur).
 *
 * @param mois mois au format `AAAA-MM`
 * @returns les clôtures du mois
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerCloturesDuMois(mois: string): Promise<Cloture[]> {
	return lireToutesLesPages((page) =>
		apiFetch<PageResponse<Cloture>>(CHEMIN_CLOTURES, {
			parametres: { mois, page, taille: TAILLE_PAGE_MAX },
		}),
	)
}

/**
 * @param projetId identifiant du projet
 * @param page     numéro de page (à partir de 1)
 * @returns une page des mois clôturés du projet, du plus récent au plus ancien (ordre de l'API)
 * @throws ApiError 403 si l'appelant n'est pas membre du projet
 */
export function listerCloturesDuProjet(projetId: number, page: number): Promise<PageResponse<Cloture>> {
	return apiFetch<PageResponse<Cloture>>(CHEMIN_CLOTURES, {
		parametres: { projetId, page, taille: TAILLE_PAGE },
	})
}

/**
 * @param projetId identifiant du projet
 * @param mois     mois `AAAA-MM`
 * @returns la clôture du mois pour ce projet, ou null s'il est ouvert
 * @throws ApiError 403 si l'appelant n'est pas membre du projet
 */
export async function lireClotureDuMois(projetId: number, mois: string): Promise<Cloture | null> {
	const page = await apiFetch<PageResponse<Cloture>>(CHEMIN_CLOTURES, {
		parametres: { projetId, mois },
	})
	return page.contenu[0] ?? null
}

/**
 * @param projetId identifiant du projet
 * @param mois     mois terminé `AAAA-MM`
 * @returns la clôture créée
 * @throws ApiError 403 (ni administrateur, ni responsable ou suppléant), 409 (déjà clôturé),
 *                  422 (mois en cours ou à venir)
 */
export function cloturerMois(projetId: number, mois: string): Promise<Cloture> {
	return apiFetch<Cloture>(CHEMIN_CLOTURES, { methode: "POST", corps: { projetId, mois } })
}

/**
 * Clôture un mois terminé pour tous les projets actifs qui ne le sont pas encore (administrateur).
 *
 * @param mois mois terminé `AAAA-MM`
 * @returns les clôtures créées (éventuellement aucune)
 * @throws ApiError 403 (pas administrateur), 422 (mois en cours ou à venir)
 */
export function cloturerTousLesProjets(mois: string): Promise<Cloture[]> {
	return apiFetch<Cloture[]>(`${CHEMIN_CLOTURES}/tous-projets`, { methode: "POST", corps: { mois } })
}

/**
 * Rouvre un mois : supprime sa clôture (administrateur).
 *
 * @param id identifiant de la clôture
 * @throws ApiError 403 (pas administrateur), 404 (déjà rouverte)
 */
export async function rouvrirMois(id: number): Promise<void> {
	await apiFetch<null>(`${CHEMIN_CLOTURES}/${id}`, { methode: "DELETE" })
}
