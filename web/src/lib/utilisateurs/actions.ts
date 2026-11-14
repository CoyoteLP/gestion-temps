"use server"

import { refresh } from "next/cache"

import type { EtatAction } from "@/lib/actions/etat-action"
import { etatDonneesInvalides, etatErreur, identifiantValide, versionValide } from "@/lib/actions/resultats"
import { lireUtilisateur, modifierUtilisateur, reinitialiserRattachement } from "@/lib/api/utilisateurs"

/**
 * Active (validation d'une inscription) ou désactive une fiche (administrateur), puis rafraîchit
 * la page. L'API n'a pas d'appel dédié : la fiche est relue, puis renvoyée en entier avec le statut
 * voulu et la version affichée, pour qu'une modification faite entre-temps soit signalée (409).
 *
 * @param id      identifiant de la fiche
 * @param actif   statut voulu
 * @param version version de la fiche affichée
 * @returns l'état à afficher ; 409 → conflit
 */
export async function changerActivationAction(
	id: number,
	actif: boolean,
	version: number,
): Promise<EtatAction<never>> {
	if (!identifiantValide(id) || typeof actif !== "boolean" || !versionValide(version)) {
		return etatDonneesInvalides()
	}
	try {
		const fiche = await lireUtilisateur(id)
		await modifierUtilisateur(id, {
			email: fiche.email,
			nom: fiche.nom,
			prenom: fiche.prenom,
			actif,
			version,
		})
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * Réinitialise le rattachement d'une fiche à son compte de connexion (administrateur), puis
 * rafraîchit la page : la fiche sera reprise par l'email vérifié à la connexion suivante.
 *
 * @param id identifiant de la fiche
 * @returns l'état à afficher
 */
export async function reinitialiserRattachementAction(id: number): Promise<EtatAction<never>> {
	if (!identifiantValide(id)) {
		return etatDonneesInvalides()
	}
	try {
		await reinitialiserRattachement(id)
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}
