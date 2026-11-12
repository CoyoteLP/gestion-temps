import "server-only"

import { cache } from "react"

import { apiFetch } from "./client"
import { ApiError } from "./erreurs"
import type { ProfilRequest, Utilisateur } from "./modeles"

const CHEMIN_MON_COMPTE = "/api/utilisateurs/moi"

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
