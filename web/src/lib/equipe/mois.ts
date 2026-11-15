import { addMonths, format, lastDayOfMonth, parse } from "date-fns"

import { moisDe } from "@/lib/saisies/semaine"

/** Mois affiché : `AAAA-MM`, ses bornes `AAAA-MM-JJ` et les mois voisins. */
export type Mois = Readonly<{
	mois: string
	premierJour: string
	dernierJour: string
	precedent: string
	suivant: string
}>

const FORMAT_MOIS = "yyyy-MM"
const FORMAT_MOIS_ISO = /^\d{4}-(0[1-9]|1[0-2])$/

const versDate = (mois: string) => parse(mois, FORMAT_MOIS, new Date(0))

/**
 * @param valeur valeur à vérifier
 * @returns vrai si c'est un mois `AAAA-MM` valide
 */
export function estMoisValide(valeur: unknown): valeur is string {
	return typeof valeur === "string" && FORMAT_MOIS_ISO.test(valeur)
}

/**
 * @param mois   mois `AAAA-MM` valide
 * @param nombre mois à ajouter (négatif pour reculer)
 * @returns le mois décalé
 */
export function decalerMois(mois: string, nombre: number): string {
	return format(addMonths(versDate(mois), nombre), FORMAT_MOIS)
}

/**
 * Mois à afficher d'après l'URL (`?mois=`) ; une valeur absente ou invalide donne le mois en cours.
 *
 * @param valeur     paramètre de l'URL
 * @param dateDuJour date du jour (`AAAA-MM-JJ`, Europe/Paris)
 * @returns le mois, ses bornes et ses voisins
 */
export function lireMois(valeur: string | string[] | undefined, dateDuJour: string): Mois {
	const mois = estMoisValide(valeur) ? valeur : moisDe(dateDuJour)
	return {
		mois,
		premierJour: `${mois}-01`,
		dernierJour: format(lastDayOfMonth(versDate(mois)), "yyyy-MM-dd"),
		precedent: decalerMois(mois, -1),
		suivant: decalerMois(mois, 1),
	}
}

/**
 * Seul un mois terminé se clôture (règle de l'API).
 *
 * @param mois       mois `AAAA-MM`
 * @param dateDuJour date du jour (`AAAA-MM-JJ`, Europe/Paris)
 * @returns vrai si le mois est entièrement passé
 */
export function estMoisTermine(mois: string, dateDuJour: string): boolean {
	return mois < moisDe(dateDuJour)
}
