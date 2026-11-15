import type { Cloture, Saisie } from "@/lib/api/modeles"

import { decaler, moisDe, type Semaine } from "./semaine"

/** Ligne de la grille : une tâche et ses heures par jour. */
export type LigneGrille = Readonly<{
	tacheId: number
	libelle: string
	parJour: Readonly<Record<string, number>>
	total: number
}>

export type Grille = Readonly<{
	lignes: readonly LigneGrille[]
	totauxParJour: Readonly<Record<string, number>>
	totalSemaine: number
}>

/**
 * Grille de la semaine : cumul des saisies par tâche et par jour (plusieurs saisies d'une même tâche
 * un même jour s'additionnent), total de chaque jour et de la semaine. Les lignes sont triées par
 * libellé.
 *
 * @param saisies       saisies de la semaine
 * @param libelleTache  libellé d'une tâche (« PJT001 · Dev »)
 * @returns la grille
 */
export function calculerGrille(
	saisies: readonly Saisie[],
	libelleTache: (tacheId: number) => string,
): Grille {
	const parTache = new Map<number, Record<string, number>>()
	const totauxParJour: Record<string, number> = {}
	for (const saisie of saisies) {
		const ligne = parTache.get(saisie.tacheId) ?? {}
		ligne[saisie.jour] = (ligne[saisie.jour] ?? 0) + saisie.duree
		parTache.set(saisie.tacheId, ligne)
		totauxParJour[saisie.jour] = (totauxParJour[saisie.jour] ?? 0) + saisie.duree
	}
	const lignes = [...parTache.entries()]
		.map(([tacheId, parJour]) => ({
			tacheId,
			libelle: libelleTache(tacheId),
			parJour,
			total: Object.values(parJour).reduce((somme, duree) => somme + duree, 0),
		}))
		.sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"))
	return {
		lignes,
		totauxParJour,
		totalSemaine: Object.values(totauxParJour).reduce((somme, duree) => somme + duree, 0),
	}
}

/**
 * @param semaine        semaine affichée
 * @param totauxParJour  total des saisies de chaque jour (jours sans saisie absents)
 * @returns le temps déjà saisi pour chacun des sept jours de la semaine, 0 h pour un jour vide
 */
export function cumulDeLaSemaine(
	semaine: Semaine,
	totauxParJour: Readonly<Record<string, number>>,
): Record<string, number> {
	return Object.fromEntries(semaine.jours.map((jour) => [jour, totauxParJour[jour] ?? 0]))
}

/** Mois clôturés, par projet : clé `projetId:AAAA-MM`. */
export type MoisClotures = ReadonlySet<string>

/**
 * @param clotures clôtures lues dans l'API
 * @returns les mois clôturés, par projet
 */
export function moisClotures(clotures: readonly Cloture[]): MoisClotures {
	return new Set(clotures.map((cloture) => `${cloture.projetId}:${cloture.mois}`))
}

/**
 * @param clotures mois clôturés
 * @param projetId projet
 * @param jour     date `AAAA-MM-JJ`
 * @returns vrai si le mois du jour est clôturé pour le projet (saisies en lecture seule)
 */
export function estCloture(clotures: MoisClotures, projetId: number, jour: string): boolean {
	return clotures.has(`${projetId}:${moisDe(jour)}`)
}

/** Saisie à créer par une recopie. */
export type SaisieACreer = Readonly<{
	tacheId: number
	jour: string
	duree: number
	commentaire: string | null
}>

const JOURS_PAR_SEMAINE = 7

/**
 * Préremplissage depuis la semaine précédente : chaque saisie est recréée le même jour de la semaine
 * (lundi → lundi…), même tâche, même durée, même commentaire.
 *
 * @param saisiesPrecedentes saisies de la semaine précédente
 * @returns les saisies à créer dans la semaine affichée, dans l'ordre des jours
 */
export function saisiesAPreremplir(saisiesPrecedentes: readonly Saisie[]): SaisieACreer[] {
	return [...saisiesPrecedentes]
		.sort((a, b) => a.jour.localeCompare(b.jour))
		.map((saisie) => ({
			tacheId: saisie.tacheId,
			jour: decaler(saisie.jour, JOURS_PAR_SEMAINE),
			duree: saisie.duree,
			commentaire: saisie.commentaire,
		}))
}

/**
 * Recopie du lundi : ses saisies sont recréées sur chaque jour du mardi au vendredi qui n'a encore
 * aucune saisie ; le week-end n'est pas touché.
 *
 * @param semaine semaine affichée
 * @param saisies saisies de la semaine
 * @returns les saisies à créer, dans l'ordre des jours
 */
export function saisiesARecopierDuLundi(semaine: Semaine, saisies: readonly Saisie[]): SaisieACreer[] {
	const duLundi = saisies.filter((saisie) => saisie.jour === semaine.lundi)
	const joursRemplis = new Set(saisies.map((saisie) => saisie.jour))
	return semaine.jours
		.slice(1, 5)
		.filter((jour) => !joursRemplis.has(jour))
		.flatMap((jour) =>
			duLundi.map((saisie) => ({
				tacheId: saisie.tacheId,
				jour,
				duree: saisie.duree,
				commentaire: saisie.commentaire,
			})),
		)
}
