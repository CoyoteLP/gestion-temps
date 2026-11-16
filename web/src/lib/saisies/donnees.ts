import "server-only"

import { listerCloturesDuMois } from "@/lib/api/clotures"
import type { Cloture, Projet, Saisie, Tache, Utilisateur } from "@/lib/api/modeles"
import { listerTousLesProjets } from "@/lib/api/projets"
import { listerSaisies } from "@/lib/api/saisies"
import { listerToutesLesTaches } from "@/lib/api/taches"
import { lireMonCompte } from "@/lib/api/utilisateurs"

import { decaler, moisDe, type Semaine } from "./semaine"

/** Données de la page Saisies pour une semaine ; sans fiche (administrateur), rien d'autre n'est lu. */
export type DonneesSemaine = Readonly<{
	moi: Utilisateur | null
	saisies: readonly Saisie[]
	projets: readonly Projet[]
	taches: readonly Tache[]
	clotures: readonly Cloture[]
	/** Saisies de la semaine précédente, lues seulement si la semaine est vide (préremplissage). */
	saisiesPrecedentes: readonly Saisie[]
}>

/**
 * Lit, en parallèle, les saisies de l'utilisateur connecté pour la semaine, les projets et tâches
 * qu'il voit (libellés et choix), et les clôtures des mois de la semaine (une semaine peut en
 * chevaucher deux). Une semaine vide lit aussi la précédente, pour proposer de la préremplir.
 *
 * @param semaine semaine affichée
 * @returns les données de la semaine
 * @throws ApiError si une lecture échoue
 */
export async function lireDonneesSemaine(semaine: Semaine): Promise<DonneesSemaine> {
	const moi = await lireMonCompte()
	if (!moi) {
		return { moi: null, saisies: [], projets: [], taches: [], clotures: [], saisiesPrecedentes: [] }
	}
	const mois = [...new Set(semaine.jours.map(moisDe))]
	const [saisies, projets, taches, ...cloturesParMois] = await Promise.all([
		listerSaisies(moi.id, semaine.lundi, semaine.jours[6]),
		listerTousLesProjets(),
		listerToutesLesTaches(),
		...mois.map(listerCloturesDuMois),
	])
	const saisiesPrecedentes =
		saisies.length === 0
			? await listerSaisies(moi.id, semaine.precedente, decaler(semaine.precedente, 6))
			: []
	return { moi, saisies, projets, taches, clotures: cloturesParMois.flat(), saisiesPrecedentes }
}
