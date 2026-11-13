import "server-only"

import { cache } from "react"

import { TAILLE_PAGE, TAILLE_PAGE_MAX } from "@/lib/constantes"

import { apiFetch } from "./client"
import { ApiError } from "./erreurs"
import type { ProfilRequest, Utilisateur, UtilisateurRequest } from "./modeles"
import { lireToutesLesPages } from "./pages"
import type { PageResponse } from "./types"

const CHEMIN_UTILISATEURS = "/api/utilisateurs"
const CHEMIN_MON_COMPTE = `${CHEMIN_UTILISATEURS}/moi`

/**
 * Fiche de l'utilisateur connecté, active ou non. Lue une seule fois par rendu (partagée entre la
 * vérification du compte, le menu et la page Profil).
 *
 * @returns la fiche, ou null si le compte n'a pas encore de fiche (404)
 * @throws ApiError pour toute autre erreur de l'API, ou si elle est injoignable
 */
export const lireMonCompte = cache(async (): Promise<Utilisateur | null> => {
	try {
		return await apiFetch<Utilisateur>(CHEMIN_MON_COMPTE)
	} catch (erreur) {
		if (erreur instanceof ApiError && erreur.statut === 404) {
			return null
		}
		throw erreur
	}
})

/**
 * Crée la fiche de l'utilisateur connecté à partir de son jeton (email vérifié, prénom, nom). La
 * fiche est inactive jusqu'à sa validation par un administrateur.
 *
 * @param jeton jeton d'accès à utiliser quand celui de la session ne convient pas (connexion en
 *              cours, jeton renouvelé) ; par défaut, celui de la session
 * @returns la fiche créée
 * @throws ApiError 409 si la fiche existe déjà, 422 si l'email n'est pas vérifié ou l'identité incomplète
 */
export function enregistrerMonCompte(jeton?: string): Promise<Utilisateur> {
	return apiFetch<Utilisateur>(CHEMIN_MON_COMPTE, { methode: "POST", jeton })
}

/**
 * @param profil nom, prénom et version lue
 * @returns la fiche modifiée, avec sa nouvelle version
 * @throws ApiError 409 si la fiche a été modifiée entre-temps, 400 si le profil est invalide
 */
export function modifierMonProfil(profil: ProfilRequest): Promise<Utilisateur> {
	return apiFetch<Utilisateur>(CHEMIN_MON_COMPTE, { methode: "PUT", corps: profil })
}

/**
 * Liste des fiches, réservée à l'administrateur.
 *
 * @param actif filtre sur le statut (`false` = en attente de validation ou désactivées) ; tous si absent
 * @param page  numéro de page, à partir de 1
 * @param taille nombre de fiches par page
 * @returns une page de fiches, triées par l'API
 * @throws ApiError 403 pour un non-administrateur
 */
export function listerUtilisateurs(
	actif: boolean | undefined,
	page: number,
	taille: number = TAILLE_PAGE,
): Promise<PageResponse<Utilisateur>> {
	return apiFetch<PageResponse<Utilisateur>>(CHEMIN_UTILISATEURS, {
		parametres: { actif, page, taille },
	})
}

/**
 * Toutes les fiches actives (choix d'un membre de projet), réservé à l'administrateur.
 *
 * @returns les fiches actives, triées par l'API
 * @throws ApiError 403 pour un non-administrateur
 */
export function listerTousLesUtilisateursActifs(): Promise<Utilisateur[]> {
	return lireToutesLesPages((page) => listerUtilisateurs(true, page, TAILLE_PAGE_MAX))
}

/**
 * @param id identifiant de la fiche
 * @returns la fiche, réservée à l'administrateur
 * @throws ApiError 404 si la fiche n'existe pas
 */
export function lireUtilisateur(id: number): Promise<Utilisateur> {
	return apiFetch<Utilisateur>(`${CHEMIN_UTILISATEURS}/${id}`)
}

/**
 * Modifie une fiche (administrateur) : l'API attend la fiche complète, avec la version lue.
 *
 * @param id          identifiant de la fiche
 * @param utilisateur email, nom, prénom, statut et version
 * @returns la fiche modifiée
 * @throws ApiError 409 si la fiche a été modifiée entre-temps ou si l'email est déjà utilisé
 */
export function modifierUtilisateur(id: number, utilisateur: UtilisateurRequest): Promise<Utilisateur> {
	return apiFetch<Utilisateur>(`${CHEMIN_UTILISATEURS}/${id}`, { methode: "PUT", corps: utilisateur })
}
