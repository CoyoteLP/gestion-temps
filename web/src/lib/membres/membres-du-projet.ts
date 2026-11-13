import "server-only"

import { ApiError } from "@/lib/api/erreurs"
import { listerTousLesMembres } from "@/lib/api/membres"
import type { MembreProjet, Utilisateur } from "@/lib/api/modeles"
import { lireUtilisateur, listerTousLesUtilisateursActifs } from "@/lib/api/utilisateurs"

/** Membre d'un projet avec sa fiche (null si elle a disparu entre deux lectures). */
export type MembreAffiche = MembreProjet & { utilisateur: Utilisateur | null }

/**
 * Membres d'un projet avec leur nom, et utilisateurs actifs qui peuvent encore y être ajoutés.
 * Réservé à l'administrateur (seul autorisé à lire les fiches). Les membres renvoient des
 * identifiants : les fiches actives sont lues en une fois, puis celles des membres désactivés une
 * par une (cas rare).
 *
 * @param projetId identifiant du projet
 * @returns les membres et les candidats à l'ajout
 * @throws ApiError si une lecture échoue (sauf fiche disparue entre-temps)
 */
export async function lireMembresDuProjet(
	projetId: number,
): Promise<{ membres: MembreAffiche[]; candidats: Utilisateur[] }> {
	const [membres, actifs] = await Promise.all([
		listerTousLesMembres(projetId),
		listerTousLesUtilisateursActifs(),
	])
	const fiches = new Map(actifs.map((fiche) => [fiche.id, fiche]))
	const absents = [...new Set(membres.map((membre) => membre.utilisateurId))].filter(
		(id) => !fiches.has(id),
	)
	const complements = await Promise.all(absents.map(lireFicheSiExistante))
	for (const fiche of complements) {
		if (fiche) {
			fiches.set(fiche.id, fiche)
		}
	}
	const dejaMembres = new Set(membres.map((membre) => membre.utilisateurId))
	return {
		membres: membres.map((membre) => ({
			...membre,
			utilisateur: fiches.get(membre.utilisateurId) ?? null,
		})),
		candidats: actifs.filter((fiche) => !dejaMembres.has(fiche.id)),
	}
}

async function lireFicheSiExistante(id: number): Promise<Utilisateur | null> {
	try {
		return await lireUtilisateur(id)
	} catch (erreur) {
		if (erreur instanceof ApiError && erreur.statut === 404) {
			return null
		}
		throw erreur
	}
}
