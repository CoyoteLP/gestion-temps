import "server-only"

import { cache } from "react"

import { TAILLE_PAGE } from "@/lib/constantes"

import { apiFetch } from "./client"
import type { Projet, ProjetRequest } from "./modeles"
import type { PageResponse } from "./types"

const CHEMIN_PROJETS = "/api/projets"

/**
 * @param page numéro de page, à partir de 1
 * @returns une page de projets, triés par l'API
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerProjets(page: number): Promise<PageResponse<Projet>> {
	return apiFetch<PageResponse<Projet>>(CHEMIN_PROJETS, { parametres: { page, taille: TAILLE_PAGE } })
}

/**
 * Projet lu une seule fois par rendu (partagé entre la fiche et ses sections).
 *
 * @param id identifiant du projet
 * @returns le projet
 * @throws ApiError 404 si le projet n'existe pas
 */
export const lireProjet = cache((id: number): Promise<Projet> => apiFetch<Projet>(`${CHEMIN_PROJETS}/${id}`))

/**
 * @param projet projet à créer (sans version)
 * @returns le projet créé
 * @throws ApiError 409 si le code est déjà utilisé, 400 si le projet est invalide
 */
export function creerProjet(projet: ProjetRequest): Promise<Projet> {
	return apiFetch<Projet>(CHEMIN_PROJETS, { methode: "POST", corps: projet })
}

/**
 * @param id     identifiant du projet
 * @param projet nouvelles valeurs, avec la version lue
 * @returns le projet modifié, avec sa nouvelle version
 * @throws ApiError 409 si le projet a été modifié entre-temps ou si le code est déjà utilisé
 */
export function modifierProjet(id: number, projet: ProjetRequest): Promise<Projet> {
	return apiFetch<Projet>(`${CHEMIN_PROJETS}/${id}`, { methode: "PUT", corps: projet })
}

/**
 * Supprime un projet sans tâche (ses membres et clôtures sont retirés avec lui).
 *
 * @param id identifiant du projet
 * @throws ApiError 409 si le projet a des tâches (le désactiver à la place)
 */
export async function supprimerProjet(id: number): Promise<void> {
	await apiFetch<null>(`${CHEMIN_PROJETS}/${id}`, { methode: "DELETE" })
}
