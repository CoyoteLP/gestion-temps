import { TAILLE_PAGE } from "@/lib/constantes"
import type { EtatListe } from "@/lib/listes/etat-liste"

/**
 * Paramètres de page et de tri communs aux listes de l'API ; le sens n'est envoyé qu'avec une
 * colonne de tri (l'ordre par défaut de l'API est l'identifiant croissant).
 *
 * @param etat état de la liste
 * @returns `page`, `taille`, `tri` et `sens` pour l'API
 */
export function parametresTri(etat: EtatListe) {
	return {
		page: etat.page,
		taille: TAILLE_PAGE,
		tri: etat.tri ?? undefined,
		sens: etat.tri ? etat.sens : undefined,
	}
}
