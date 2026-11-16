import { isValid, parseISO } from "date-fns"
import { z } from "zod"

import type { Projet, ProjetRequest } from "@/lib/api/modeles"
import { LONGUEUR_MAX_CODE_PROJET, LONGUEUR_MAX_DESCRIPTION, LONGUEUR_MAX_NOM_PROJET } from "@/lib/constantes"

const FORMAT_DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Date facultative d'un champ `type="date"` : vide, ou `AAAA-MM-JJ`. */
const champDate = (libelle: string) =>
	z
		.string()
		.refine(
			(valeur) => valeur === "" || (FORMAT_DATE_ISO.test(valeur) && isValid(parseISO(valeur))),
			`${libelle} n'est pas une date valide`,
		)

/**
 * Valeurs du formulaire d'un projet, avec les bornes de `ProjetRequest` (API). Les champs
 * facultatifs vides valent `""` (description, dates : période ouverte).
 */
export const schemaProjet = z
	.object({
		code: z
			.string()
			.trim()
			.min(1, "Le code est obligatoire")
			.max(
				LONGUEUR_MAX_CODE_PROJET,
				`Le code ne doit pas dépasser ${LONGUEUR_MAX_CODE_PROJET} caractères`,
			),
		nom: z
			.string()
			.trim()
			.min(1, "Le nom est obligatoire")
			.max(
				LONGUEUR_MAX_NOM_PROJET,
				`Le nom ne doit pas dépasser ${LONGUEUR_MAX_NOM_PROJET} caractères`,
			),
		description: z
			.string()
			.trim()
			.max(
				LONGUEUR_MAX_DESCRIPTION,
				`La description ne doit pas dépasser ${LONGUEUR_MAX_DESCRIPTION} caractères`,
			),
		dateDebut: champDate("La date de début"),
		dateFin: champDate("La date de fin"),
		actif: z.boolean(),
	})
	.refine((projet) => !projet.dateDebut || !projet.dateFin || projet.dateFin >= projet.dateDebut, {
		path: ["dateFin"],
		message: "La date de fin doit être postérieure ou égale à la date de début",
	})

export type ValeursProjet = z.infer<typeof schemaProjet>

/**
 * @param projet projet à modifier, ou rien pour une création (actif par défaut)
 * @returns les valeurs initiales du formulaire
 */
export function valeursDuProjet(projet?: Projet): ValeursProjet {
	return {
		code: projet?.code ?? "",
		nom: projet?.nom ?? "",
		description: projet?.description ?? "",
		dateDebut: projet?.dateDebut ?? "",
		dateFin: projet?.dateFin ?? "",
		actif: projet?.actif ?? true,
	}
}

/**
 * @param valeurs valeurs validées du formulaire
 * @param version version lue, en modification seulement
 * @returns le corps de la requête ; un champ facultatif vide est omis (enregistré vide par l'API)
 */
export function versRequeteProjet(valeurs: ValeursProjet, version?: number): ProjetRequest {
	return {
		code: valeurs.code,
		nom: valeurs.nom,
		description: valeurs.description || undefined,
		dateDebut: valeurs.dateDebut || undefined,
		dateFin: valeurs.dateFin || undefined,
		actif: valeurs.actif,
		version,
	}
}
