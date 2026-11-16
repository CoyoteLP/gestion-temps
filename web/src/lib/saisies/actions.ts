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
import { creerSaisie, listerSaisies, modifierSaisie, supprimerSaisie } from "@/lib/api/saisies"
import { lireMonCompte } from "@/lib/api/utilisateurs"

import type { CompteRenduRecopie, RefusRecopie } from "./compte-rendu"
import { type SaisieACreer, saisiesAPreremplir, saisiesARecopierDuLundi } from "./grille"
import { schemaSaisie, type ValeursSaisie, versRequeteSaisie } from "./schema-saisie"
import { decaler, estJourValide, lireSemaine, lundiDe, type Semaine } from "./semaine"

type EtatSaisie = EtatAction<keyof ValeursSaisie>

const MESSAGE_SANS_FICHE = "Votre compte n'a pas de fiche utilisateur : la saisie des temps lui est fermée."

/**
 * Crée une saisie pour l'utilisateur connecté, puis rafraîchit la page.
 *
 * @param valeurs valeurs du dialogue, revalidées ici
 * @returns l'état à afficher ; un refus de l'API (24 h, mois clôturé…) donne son message
 */
export async function creerSaisieAction(valeurs: ValeursSaisie): Promise<EtatSaisie> {
	const resultat = schemaSaisie.safeParse(valeurs)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	try {
		await creerSaisie(versRequeteSaisie(resultat.data))
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * Modifie une saisie (jour, tâche, durée, commentaire), puis rafraîchit la page.
 *
 * @param id      identifiant de la saisie
 * @param valeurs valeurs du dialogue, revalidées ici
 * @param version version lue avant modification
 * @returns l'état à afficher ; 409 → conflit
 */
export async function modifierSaisieAction(
	id: number,
	valeurs: ValeursSaisie,
	version: number,
): Promise<EtatSaisie> {
	const resultat = schemaSaisie.safeParse(valeurs)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	if (!identifiantValide(id) || !versionValide(version)) {
		return etatDonneesInvalides()
	}
	try {
		await modifierSaisie(id, versRequeteSaisie(resultat.data, version))
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * @param id identifiant de la saisie
 * @returns succès, ou le refus de l'API (mois clôturé)
 */
export async function supprimerSaisieAction(id: number): Promise<EtatAction<never>> {
	if (!identifiantValide(id)) {
		return etatDonneesInvalides()
	}
	try {
		await supprimerSaisie(id)
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * Préremplit une semaine **vide** avec les saisies de la semaine précédente (même jour de la semaine,
 * tâche, durée et commentaire). Les saisies refusées par l'API n'empêchent pas les autres.
 *
 * @param lundi lundi de la semaine à préremplir
 * @returns le compte rendu (créées, refusées et pourquoi)
 */
export async function preremplirSemaineAction(lundi: string): Promise<CompteRenduRecopie> {
	return recopier(lundi, async (utilisateurId, semaine, saisies) => {
		if (saisies.length > 0) {
			return "La semaine contient déjà des saisies : le préremplissage n'est proposé que sur une semaine vide."
		}
		const precedentes = await listerSaisies(
			utilisateurId,
			semaine.precedente,
			decaler(semaine.precedente, 6),
		)
		return precedentes.length > 0
			? saisiesAPreremplir(precedentes)
			: "La semaine précédente n'a aucune saisie à recopier."
	})
}

/**
 * Recopie les saisies du lundi sur chaque jour vide du mardi au vendredi. Les saisies refusées par
 * l'API n'empêchent pas les autres.
 *
 * @param lundi lundi de la semaine
 * @returns le compte rendu (créées, refusées et pourquoi)
 */
export async function recopierLundiAction(lundi: string): Promise<CompteRenduRecopie> {
	return recopier(lundi, async (_utilisateurId, semaine, saisies) => {
		const aCreer = saisiesARecopierDuLundi(semaine, saisies)
		return aCreer.length > 0
			? aCreer
			: "Rien à recopier : le lundi n'a pas de saisie, ou tous les jours du mardi au vendredi en ont déjà."
	})
}

/**
 * Déroulé commun des recopies : semaine vérifiée, saisies de la semaine relues (les règles sont
 * revérifiées ici : un double clic ou un autre onglet ne crée pas de doublons), puis création une par
 * une dans l'ordre des jours (l'API n'a pas d'appel groupé).
 */
async function recopier(
	lundi: string,
	aCreer: (
		utilisateurId: number,
		semaine: Semaine,
		saisies: Awaited<ReturnType<typeof listerSaisies>>,
	) => Promise<SaisieACreer[] | string>,
): Promise<CompteRenduRecopie> {
	if (!estJourValide(lundi) || lundiDe(lundi) !== lundi) {
		return { statut: "erreur", message: "Semaine invalide : rechargez la page avant de recommencer." }
	}
	const semaine = lireSemaine(lundi, lundi)
	let saisies: SaisieACreer[]
	try {
		const moi = await lireMonCompte()
		if (!moi) {
			return { statut: "erreur", message: MESSAGE_SANS_FICHE }
		}
		const resultat = await aCreer(
			moi.id,
			semaine,
			await listerSaisies(moi.id, semaine.lundi, semaine.jours[6]),
		)
		if (typeof resultat === "string") {
			return { statut: "erreur", message: resultat }
		}
		saisies = resultat
	} catch (erreur) {
		if (!(erreur instanceof ApiError)) {
			throw erreur
		}
		return {
			statut: "erreur",
			message: erreur.message,
			identifiantCorrelation: erreur.identifiantCorrelation,
		}
	}

	let creees = 0
	const refus: RefusRecopie[] = []
	for (const saisie of saisies) {
		try {
			await creerSaisie({
				tacheId: saisie.tacheId,
				jour: saisie.jour,
				duree: saisie.duree,
				commentaire: saisie.commentaire ?? undefined,
			})
			creees++
		} catch (erreur) {
			if (!(erreur instanceof ApiError)) {
				throw erreur
			}
			refus.push({ jour: saisie.jour, tacheId: saisie.tacheId, message: erreur.message })
		}
	}
	if (creees > 0) {
		refresh()
	}
	return { statut: "succes", creees, refus }
}
