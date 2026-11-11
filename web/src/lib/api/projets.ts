import "server-only"

import { TAILLE_PAGE } from "@/lib/constantes"

import { apiFetch } from "./client"
import type { Projet } from "./modeles"
import type { PageResponse } from "./types"

/**
 * @param page numéro de page, à partir de 1
 * @returns une page de projets, triés par l'API
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerProjets(page: number): Promise<PageResponse<Projet>> {
	return apiFetch<PageResponse<Projet>>("/api/projets", { parametres: { page, taille: TAILLE_PAGE } })
}
