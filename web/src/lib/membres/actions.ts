"use server"

import { refresh } from "next/cache"

import type { EtatAction } from "@/lib/actions/etat-action"
import {
	etatDonneesInvalides,
	etatErreur,
	etatInvalide,
	identifiantValide,
	versionValide,
} from "@/lib/actions/resultats"
import { ApiError } from "@/lib/api/erreurs"
import { ajouterMembre, modifierMembre, retirerMembre } from "@/lib/api/membres"

import { schemaMembre, type ValeursMembre } from "./schema-membre"

type EtatMembre = EtatAction<keyof ValeursMembre>

/**
 * Ajoute un membre à un projet (administrateur), puis rafraîchit la page.
 *
 * @param projetId identifiant du projet
 * @param valeurs  utilisateur et rôle choisis, revalidés ici
 * @returns l'état à afficher ; un utilisateur déjà membre (409) est rattaché au champ utilisateur
 */
export async function ajouterMembreAction(projetId: number, valeurs: ValeursMembre): Promise<EtatMembre> {
	const resultat = schemaMembre.safeParse(valeurs)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	if (!identifiantValide(projetId)) {
		return etatDonneesInvalides()
	}
	try {
		await ajouterMembre(projetId, resultat.data)
	} catch (erreur) {
		if (erreur instanceof ApiError && erreur.statut === 409) {
			return { statut: "invalide", erreurs: { utilisateurId: erreur.message } }
		}
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * Change le rôle d'un membre (administrateur), puis rafraîchit la page.
 *
 * @param projetId identifiant du projet
 * @param id       identifiant du membre
 * @param valeurs  utilisateur (inchangé) et nouveau rôle
 * @param version  version du membre lue avant modification
 * @returns l'état à afficher ; 409 → conflit
 */
export async function modifierMembreAction(
	projetId: number,
	id: number,
	valeurs: ValeursMembre,
	version: number,
): Promise<EtatMembre> {
	const resultat = schemaMembre.safeParse(valeurs)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	if (!identifiantValide(projetId) || !identifiantValide(id) || !versionValide(version)) {
		return etatDonneesInvalides()
	}
	try {
		await modifierMembre(projetId, id, { ...resultat.data, version })
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * Retire un membre d'un projet (administrateur), puis rafraîchit la page.
 *
 * @param projetId identifiant du projet
 * @param id       identifiant du membre
 * @returns l'état à afficher
 */
export async function retirerMembreAction(projetId: number, id: number): Promise<EtatAction<never>> {
	if (!identifiantValide(projetId) || !identifiantValide(id)) {
		return etatDonneesInvalides()
	}
	try {
		await retirerMembre(projetId, id)
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}
