import "server-only"

import { ApiError } from "@/lib/api/erreurs"
import { listerMembres, listerTousLesMembres } from "@/lib/api/membres"
import type { MembreProjet, Utilisateur } from "@/lib/api/modeles"
import type { PageResponse } from "@/lib/api/types"
import { lireUtilisateur, listerTousLesUtilisateursActifs } from "@/lib/api/utilisateurs"
import type { EtatListe } from "@/lib/listes/etat-liste"

/** Membre d'un projet avec sa fiche (null si elle a disparu entre deux lectures). */
export type MembreAffiche = MembreProjet & { utilisateur: Utilisateur | null }

/**
 * Page de membres d'un projet (triée et filtrée par l'API) avec leur nom, et utilisateurs actifs qui
 * peuvent encore y être ajoutés. Réservé à l'administrateur (seul autorisé à lire les fiches). Les
 * membres renvoient des identifiants : les fiches actives sont lues en une fois, puis celles des
 * membres désactivés une par une (cas rare). Les candidats écartent tous les membres, pas seulement
 * ceux de la page affichée.
 *
 * @param projetId identifiant du projet
 * @param etat     page, tri et filtres de la liste des membres
 * @returns la page de membres et les candidats à l'ajout
 * @throws ApiError si une lecture échoue (sauf fiche disparue entre-temps)
 */
export async function lireMembresDuProjet(
	projetId: number,
	etat: EtatListe,
): Promise<{ membres: PageResponse<MembreAffiche>; candidats: Utilisateur[] }> {
	const [page, tousLesMembres, actifs] = await Promise.all([
		listerMembres(projetId, etat),
		listerTousLesMembres(projetId),
		listerTousLesUtilisateursActifs(),
	])
	const fiches = new Map(actifs.map((fiche) => [fiche.id, fiche]))
	const absents = [...new Set(page.contenu.map((membre) => membre.utilisateurId))].filter(
		(id) => !fiches.has(id),
	)
	const complements = await Promise.all(absents.map(lireFicheSiExistante))
	for (const fiche of complements) {
		if (fiche) {
			fiches.set(fiche.id, fiche)
		}
	}
	const dejaMembres = new Set(tousLesMembres.map((membre) => membre.utilisateurId))
	return {
		membres: {
			...page,
			contenu: page.contenu.map((membre) => ({
				...membre,
				utilisateur: fiches.get(membre.utilisateurId) ?? null,
			})),
		},
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
