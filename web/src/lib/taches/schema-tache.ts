import { z } from "zod"

import type { Tache, TacheRequest } from "@/lib/api/modeles"
import { LONGUEUR_MAX_DESCRIPTION, LONGUEUR_MAX_LIBELLE_TACHE } from "@/lib/constantes"

/** Valeurs du formulaire d'une tâche, avec les bornes de `TacheRequest` (API). */
export const schemaTache = z.object({
	libelle: z
		.string()
		.trim()
		.min(1, "Le libellé est obligatoire")
		.max(
			LONGUEUR_MAX_LIBELLE_TACHE,
			`Le libellé ne doit pas dépasser ${LONGUEUR_MAX_LIBELLE_TACHE} caractères`,
		),
	description: z
		.string()
		.trim()
		.max(
			LONGUEUR_MAX_DESCRIPTION,
			`La description ne doit pas dépasser ${LONGUEUR_MAX_DESCRIPTION} caractères`,
		),
	actif: z.boolean(),
})

export type ValeursTache = z.infer<typeof schemaTache>

/**
 * @param tache tâche à modifier, ou rien pour une création (active par défaut)
 * @returns les valeurs initiales du formulaire
 */
export function valeursDeLaTache(tache?: Pick<Tache, "libelle" | "description" | "actif">): ValeursTache {
	return {
		libelle: tache?.libelle ?? "",
		description: tache?.description ?? "",
		actif: tache?.actif ?? true,
	}
}

/**
 * @param projetId projet de la tâche (inchangé en modification)
 * @param valeurs  valeurs validées du formulaire
 * @param version  version lue, en modification seulement
 * @returns le corps de la requête ; une description vide est omise
 */
export function versRequeteTache(projetId: number, valeurs: ValeursTache, version?: number): TacheRequest {
	return {
		projetId,
		libelle: valeurs.libelle,
		description: valeurs.description || undefined,
		actif: valeurs.actif,
		version,
	}
}
