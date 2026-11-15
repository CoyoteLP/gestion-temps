import "server-only"

import { TAILLE_PAGE_MAX } from "@/lib/constantes"

import { apiFetch } from "./client"
import type { Cloture } from "./modeles"
import { lireToutesLesPages } from "./pages"
import type { PageResponse } from "./types"

/**
 * Clôtures d'un mois, pour les projets visibles par l'utilisateur (tous pour un administrateur).
 *
 * @param mois mois au format `AAAA-MM`
 * @returns les clôtures du mois
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerCloturesDuMois(mois: string): Promise<Cloture[]> {
	return lireToutesLesPages((page) =>
		apiFetch<PageResponse<Cloture>>("/api/clotures", {
			parametres: { mois, page, taille: TAILLE_PAGE_MAX },
		}),
	)
}
