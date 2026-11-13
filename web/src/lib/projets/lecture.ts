import "server-only"

import { notFound } from "next/navigation"

import { ApiError } from "@/lib/api/erreurs"
import type { Projet } from "@/lib/api/modeles"
import { lireProjet } from "@/lib/api/projets"
import { lireIdentifiant } from "@/lib/identifiant"

/**
 * Projet désigné par l'URL (`/projets/[id]`). Un identifiant invalide ou un projet inconnu affiche
 * la page « introuvable ».
 *
 * @param valeur segment `id` de l'URL
 * @returns le projet, ou l'erreur de l'API à afficher (API injoignable, accès refusé…)
 */
export async function lireProjetDeLaPage(valeur: string): Promise<Projet | ApiError> {
	const id = lireIdentifiant(valeur)
	if (id === null) {
		notFound()
	}
	try {
		return await lireProjet(id)
	} catch (erreur) {
		if (!(erreur instanceof ApiError)) {
			throw erreur
		}
		if (erreur.statut === 404) {
			notFound()
		}
		return erreur
	}
}
