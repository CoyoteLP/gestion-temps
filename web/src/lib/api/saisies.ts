import "server-only"

import { TAILLE_PAGE_MAX } from "@/lib/constantes"

import { apiFetch } from "./client"
import type { Saisie, SaisieRequest } from "./modeles"
import { lireToutesLesPages } from "./pages"
import type { PageResponse } from "./types"

const CHEMIN_SAISIES = "/api/saisies-temps"

/**
 * Saisies d'un utilisateur sur une période (une semaine : la liste est lue en entier). L'utilisateur
 * est toujours précisé : sans lui, l'API renverrait à un administrateur les saisies de tous.
 *
 * @param utilisateurId identifiant de la fiche dont on lit les saisies
 * @param du            premier jour (inclus), `AAAA-MM-JJ`
 * @param au            dernier jour (inclus), `AAAA-MM-JJ`
 * @returns les saisies de la période, triées par jour par l'API
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerSaisies(utilisateurId: number, du: string, au: string): Promise<Saisie[]> {
	return lireToutesLesPages((page) =>
		apiFetch<PageResponse<Saisie>>(CHEMIN_SAISIES, {
			parametres: { utilisateurId, du, au, page, taille: TAILLE_PAGE_MAX },
		}),
	)
}

/**
 * Crée une saisie pour l'utilisateur connecté (l'API retient l'appelant).
 *
 * @param saisie tâche, jour, durée, commentaire (sans version)
 * @returns la saisie créée
 * @throws ApiError 422 si une règle est enfreinte (24 h, mois clôturé, non-membre, période…)
 */
export function creerSaisie(saisie: SaisieRequest): Promise<Saisie> {
	return apiFetch<Saisie>(CHEMIN_SAISIES, { methode: "POST", corps: saisie })
}

/**
 * @param id     identifiant de la saisie
 * @param saisie nouvelles valeurs, avec la version lue
 * @returns la saisie modifiée
 * @throws ApiError 409 si elle a été modifiée entre-temps, 422 si une règle est enfreinte
 */
export function modifierSaisie(id: number, saisie: SaisieRequest): Promise<Saisie> {
	return apiFetch<Saisie>(`${CHEMIN_SAISIES}/${id}`, { methode: "PUT", corps: saisie })
}

/**
 * @param id identifiant de la saisie
 * @throws ApiError 422 si son mois est clôturé pour son projet
 */
export async function supprimerSaisie(id: number): Promise<void> {
	await apiFetch<null>(`${CHEMIN_SAISIES}/${id}`, { methode: "DELETE" })
}
