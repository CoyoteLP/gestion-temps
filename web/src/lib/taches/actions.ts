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
import { creerTache, modifierTache, supprimerTache } from "@/lib/api/taches"

import { schemaTache, type ValeursTache, versRequeteTache } from "./schema-tache"

type EtatTache = EtatAction<keyof ValeursTache>

/**
 * Crée une tâche dans un projet (administrateur), puis rafraîchit la page.
 *
 * @param projetId projet de la tâche
 * @param valeurs  valeurs saisies, revalidées ici
 * @returns l'état à afficher
 */
export async function creerTacheAction(projetId: number, valeurs: ValeursTache): Promise<EtatTache> {
	const resultat = schemaTache.safeParse(valeurs)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	if (!identifiantValide(projetId)) {
		return etatDonneesInvalides()
	}
	try {
		await creerTache(versRequeteTache(projetId, resultat.data))
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * Modifie une tâche (administrateur), qui reste dans son projet, puis rafraîchit la page.
 *
 * @param id       identifiant de la tâche
 * @param projetId projet de la tâche
 * @param valeurs  valeurs saisies, revalidées ici
 * @param version  version de la tâche lue avant modification
 * @returns l'état à afficher ; 409 → conflit
 */
export async function modifierTacheAction(
	id: number,
	projetId: number,
	valeurs: ValeursTache,
	version: number,
): Promise<EtatTache> {
	const resultat = schemaTache.safeParse(valeurs)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	if (!identifiantValide(id) || !identifiantValide(projetId) || !versionValide(version)) {
		return etatDonneesInvalides()
	}
	try {
		await modifierTache(id, versRequeteTache(projetId, resultat.data, version))
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * Supprime une tâche sans saisie (administrateur), puis rafraîchit la page.
 *
 * @param id identifiant de la tâche
 * @returns succès, ou le refus de l'API (tâche qui a des saisies : à désactiver plutôt)
 */
export async function supprimerTacheAction(id: number): Promise<EtatAction<never>> {
	if (!identifiantValide(id)) {
		return etatDonneesInvalides()
	}
	try {
		await supprimerTache(id)
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}
