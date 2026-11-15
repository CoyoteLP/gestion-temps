import "server-only"

import { cache } from "react"

import { TAILLE_PAGE_MAX } from "@/lib/constantes"
import { type EtatListe, versActif } from "@/lib/listes/etat-liste"

import { apiFetch } from "./client"
import type { Projet, ProjetRequest } from "./modeles"
import { lireToutesLesPages } from "./pages"
import { parametresTri } from "./parametres-liste"
import type { PageResponse } from "./types"

const CHEMIN_PROJETS = "/api/projets"

/**
 * @param etat page, tri et filtres de la liste (code, nom, statut)
 * @returns une page de projets, triés et filtrés par l'API
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerProjets(etat: EtatListe): Promise<PageResponse<Projet>> {
	return apiFetch<PageResponse<Projet>>(CHEMIN_PROJETS, {
		parametres: {
			...parametresTri(etat),
			code: etat.filtres.code,
			nom: etat.filtres.nom,
			actif: versActif(etat.filtres.actif),
		},
	})
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

/**
 * Tous les projets visibles par l'utilisateur (ceux dont il est membre, tous pour un administrateur),
 * avec son rôle : pour le choix d'un projet et les libellés des saisies.
 *
 * @returns les projets, triés par l'API
 * @throws ApiError si l'API refuse ou est injoignable
 */
export function listerTousLesProjets(): Promise<Projet[]> {
	return lireToutesLesPages((page) =>
		apiFetch<PageResponse<Projet>>(CHEMIN_PROJETS, { parametres: { page, taille: TAILLE_PAGE_MAX } }),
	)
}
