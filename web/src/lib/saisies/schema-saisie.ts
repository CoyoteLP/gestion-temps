import { z } from "zod"

import type { Saisie, SaisieRequest } from "@/lib/api/modeles"
import {
	DUREE_MAX_SAISIE,
	DUREE_MIN_SAISIE,
	LONGUEUR_MAX_COMMENTAIRE,
	PAS_DUREE_SAISIE,
} from "@/lib/constantes"

import { estJourValide } from "./semaine"

const libelleHeures = (valeur: number) => `${String(valeur).replace(".", ",")} h`

/**
 * Valeurs du dialogue de saisie, avec les règles de `SaisieTempsRequest` (API). Le projet ne sert
 * qu'à choisir la tâche ; l'API vérifie le reste (24 h par jour, mois clôturé, période du projet).
 */
export const schemaSaisie = z.object({
	projetId: z.number().int().positive("Choisissez un projet"),
	tacheId: z.number().int().positive("Choisissez une tâche"),
	jour: z.string().refine(estJourValide, "Choisissez un jour"),
	duree: z
		.number("Indiquez une durée")
		.min(DUREE_MIN_SAISIE, `La durée doit être d'au moins ${libelleHeures(DUREE_MIN_SAISIE)}`)
		.max(DUREE_MAX_SAISIE, `La durée ne doit pas dépasser ${libelleHeures(DUREE_MAX_SAISIE)}`)
		.refine(
			(duree) => Number.isInteger(duree / PAS_DUREE_SAISIE),
			`La durée doit être un multiple de ${libelleHeures(PAS_DUREE_SAISIE)}`,
		),
	commentaire: z
		.string()
		.trim()
		.max(
			LONGUEUR_MAX_COMMENTAIRE,
			`Le commentaire ne doit pas dépasser ${LONGUEUR_MAX_COMMENTAIRE} caractères`,
		),
})

export type ValeursSaisie = z.infer<typeof schemaSaisie>

/**
 * @param valeurs valeurs validées du dialogue
 * @param version version lue, en modification seulement
 * @returns le corps de la requête (sans utilisateur : l'API retient l'appelant)
 */
export function versRequeteSaisie(valeurs: ValeursSaisie, version?: number): SaisieRequest {
	return {
		tacheId: valeurs.tacheId,
		jour: valeurs.jour,
		duree: valeurs.duree,
		commentaire: valeurs.commentaire || undefined,
		version,
	}
}

/**
 * @param saisie   saisie à modifier, ou rien pour une création
 * @param projetId projet de sa tâche (création : aucun)
 * @param jour     jour proposé à la création
 * @returns les valeurs initiales du dialogue
 */
export function valeursDeLaSaisie(saisie: Saisie | undefined, projetId: number, jour: string): ValeursSaisie {
	return {
		projetId,
		tacheId: saisie?.tacheId ?? 0,
		jour: saisie?.jour ?? jour,
		duree: saisie?.duree ?? DUREE_MIN_SAISIE,
		commentaire: saisie?.commentaire ?? "",
	}
}
