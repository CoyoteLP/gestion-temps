import { addDays, format, isValid, parseISO, startOfISOWeek } from "date-fns"

import { FUSEAU_HORAIRE } from "@/lib/constantes"

/** Semaine affichée : du lundi au dimanche, dates au format `AAAA-MM-JJ`. */
export type Semaine = Readonly<{
	lundi: string
	/** Les sept jours, du lundi au dimanche. */
	jours: readonly string[]
	precedente: string
	suivante: string
}>

const FORMAT_JOUR = "yyyy-MM-dd"
const FORMAT_JOUR_ISO = /^\d{4}-\d{2}-\d{2}$/
const JOURS_PAR_SEMAINE = 7

const versJour = (date: Date) => format(date, FORMAT_JOUR)

/**
 * @param maintenant instant de référence
 * @returns la date du jour à Paris (`AAAA-MM-JJ`), quel que soit le fuseau du serveur
 */
export function aujourdhui(maintenant: Date = new Date()): string {
	// Le format canadien anglais donne directement AAAA-MM-JJ
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: FUSEAU_HORAIRE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(maintenant)
}

/**
 * @param jour date `AAAA-MM-JJ`
 * @returns vrai si c'est une date de calendrier valide
 */
export function estJourValide(jour: string | undefined): jour is string {
	return !!jour && FORMAT_JOUR_ISO.test(jour) && isValid(parseISO(jour))
}

/**
 * @param jour date `AAAA-MM-JJ` valide
 * @returns le lundi de sa semaine
 */
export function lundiDe(jour: string): string {
	return versJour(startOfISOWeek(parseISO(jour)))
}

/**
 * @param jour  date `AAAA-MM-JJ` valide
 * @param nombre jours à ajouter (négatif pour reculer)
 * @returns la date décalée
 */
export function decaler(jour: string, nombre: number): string {
	return versJour(addDays(parseISO(jour), nombre))
}

/**
 * Semaine à afficher d'après l'URL (`?semaine=`) : une date quelconque est ramenée à son lundi ;
 * une valeur absente ou invalide donne la semaine en cours.
 *
 * @param valeur      paramètre `semaine` de l'URL
 * @param dateDuJour  date du jour (`AAAA-MM-JJ`)
 * @returns la semaine
 */
export function lireSemaine(valeur: string | string[] | undefined, dateDuJour: string): Semaine {
	const texte = Array.isArray(valeur) ? valeur[0] : valeur
	const lundi = lundiDe(estJourValide(texte) ? texte : dateDuJour)
	return {
		lundi,
		jours: Array.from({ length: JOURS_PAR_SEMAINE }, (_, index) => decaler(lundi, index)),
		precedente: decaler(lundi, -JOURS_PAR_SEMAINE),
		suivante: decaler(lundi, JOURS_PAR_SEMAINE),
	}
}

/**
 * Jours affichés : du lundi au vendredi, plus le samedi et le dimanche s'ils ont des saisies.
 *
 * @param semaine         semaine affichée
 * @param joursAvecSaisie jours qui ont au moins une saisie
 * @returns les jours à afficher, dans l'ordre
 */
export function joursAffiches(semaine: Semaine, joursAvecSaisie: ReadonlySet<string>): string[] {
	const ouvres = semaine.jours.slice(0, 5)
	const weekEnd = semaine.jours.slice(5).filter((jour) => joursAvecSaisie.has(jour))
	return [...ouvres, ...weekEnd]
}

/**
 * @param jour date `AAAA-MM-JJ`
 * @returns le mois `AAAA-MM`
 */
export function moisDe(jour: string): string {
	return jour.slice(0, 7)
}
