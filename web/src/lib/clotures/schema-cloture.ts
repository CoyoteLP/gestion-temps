import { z } from "zod"

import type { EtatAction } from "@/lib/actions/etat-action"
import { estMoisTermine, estMoisValide } from "@/lib/equipe/mois"
import { formaterMois } from "@/lib/format"

/**
 * Mois à clôturer, avec les règles de l'API : un mois `AAAA-MM`, terminé. Partagé par le dialogue
 * (avant l'envoi) et la Server Action (qui le revalide).
 *
 * @param dateDuJour date du jour (`AAAA-MM-JJ`, Europe/Paris)
 * @returns le schéma du champ `mois`
 */
export function schemaCloture(dateDuJour: string) {
	return z.object({
		mois: z.string().superRefine((mois, contexte) => {
			if (!estMoisValide(mois)) {
				contexte.addIssue({ code: "custom", message: "Choisissez un mois" })
			} else if (!estMoisTermine(mois, dateDuJour)) {
				contexte.addIssue({
					code: "custom",
					message: `Seul un mois terminé peut être clôturé : ${formaterMois(mois)} est en cours ou à venir.`,
				})
			}
		}),
	})
}

export type ValeursCloture = z.infer<ReturnType<typeof schemaCloture>>

/**
 * Résultat d'une clôture : le succès porte le message à afficher (« Mois clôturé : octobre 2026. »,
 * « 4 projets clôturés… »), construit par la Server Action.
 */
export type EtatCloture = EtatAction<keyof ValeursCloture> | { statut: "succes"; message: string }
