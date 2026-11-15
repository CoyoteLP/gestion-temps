"use server"

import { refresh } from "next/cache"

import type { EtatAction } from "@/lib/actions/etat-action"
import { etatDonneesInvalides, etatErreur, etatInvalide, identifiantValide } from "@/lib/actions/resultats"
import { ApiError } from "@/lib/api/erreurs"
import { cloturerMois, cloturerTousLesProjets, rouvrirMois } from "@/lib/api/clotures"
import { formaterMois } from "@/lib/format"
import { aujourdhui } from "@/lib/saisies/semaine"

import { type EtatCloture, schemaCloture } from "./schema-cloture"

/**
 * Clôture un mois terminé pour un projet (administrateur, responsable ou suppléant ; l'API vérifie
 * le droit), puis rafraîchit la page.
 *
 * @param projetId identifiant du projet (lié par `bind`)
 * @param mois     mois `AAAA-MM`, revalidé ici (format, mois terminé)
 * @returns l'état à afficher ; un mois déjà clôturé (409) est rattaché au champ mois
 */
export async function cloturerMoisAction(projetId: number, mois: string): Promise<EtatCloture> {
	const resultat = schemaCloture(aujourdhui()).safeParse({ mois })
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	if (!identifiantValide(projetId)) {
		return etatDonneesInvalides()
	}
	try {
		await cloturerMois(projetId, resultat.data.mois)
	} catch (erreur) {
		return etatRefus(erreur)
	}
	refresh()
	return { statut: "succes", message: `Mois clôturé : ${formaterMois(resultat.data.mois)}.` }
}

/**
 * Clôture un mois terminé pour tous les projets actifs qui ne le sont pas encore (administrateur),
 * puis rafraîchit la page.
 *
 * @param mois mois `AAAA-MM`, revalidé ici
 * @returns l'état à afficher, avec le nombre de projets clôturés
 */
export async function cloturerTousLesProjetsAction(mois: string): Promise<EtatCloture> {
	const resultat = schemaCloture(aujourdhui()).safeParse({ mois })
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	let creees: number
	try {
		creees = (await cloturerTousLesProjets(resultat.data.mois)).length
	} catch (erreur) {
		return etatRefus(erreur)
	}
	refresh()
	const libelleMois = formaterMois(resultat.data.mois)
	let message: string
	if (creees === 0) {
		message = `Aucun projet à clôturer pour ${libelleMois} : tous l'étaient déjà.`
	} else if (creees === 1) {
		message = `1 projet clôturé pour ${libelleMois}.`
	} else {
		message = `${creees} projets clôturés pour ${libelleMois}.`
	}
	return { statut: "succes", message }
}

/**
 * Rouvre un mois clôturé (administrateur), puis rafraîchit la page.
 *
 * @param id identifiant de la clôture (lié par `bind`)
 * @returns l'état à afficher
 */
export async function rouvrirMoisAction(id: number): Promise<EtatAction<never>> {
	if (!identifiantValide(id)) {
		return etatDonneesInvalides()
	}
	try {
		await rouvrirMois(id)
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/** Refus de l'API : un mois déjà clôturé (409) est rattaché au champ, le reste affiché tel quel. */
function etatRefus(erreur: unknown): EtatCloture {
	if (erreur instanceof ApiError && erreur.statut === 409) {
		return { statut: "invalide", erreurs: { mois: erreur.message } }
	}
	return etatErreur(erreur)
}
