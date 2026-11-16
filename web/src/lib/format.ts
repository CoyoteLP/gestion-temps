import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

/**
 * @param jour date ISO de l'API (`2026-11-08`)
 * @returns la date au format français (`08/11/2026`)
 */
export function formaterDate(jour: string): string {
	return format(parseISO(jour), "dd/MM/yyyy", { locale: fr })
}

/**
 * Période d'un projet, bornes incluses ; une borne absente est ouverte.
 *
 * @param debut date de début ISO, ou null
 * @param fin   date de fin ISO, ou null
 * @returns la période en toutes lettres
 */
export function formaterPeriode(debut?: string | null, fin?: string | null): string {
	if (debut && fin) {
		return `Du ${formaterDate(debut)} au ${formaterDate(fin)}`
	}
	if (debut) {
		return `À partir du ${formaterDate(debut)}`
	}
	if (fin) {
		return `Jusqu'au ${formaterDate(fin)}`
	}
	return "Sans limite"
}

/**
 * @param nom nom complet (« Jean Dupont »)
 * @returns au plus deux initiales en majuscules (« JD »), pour un avatar
 */
export function initiales(nom: string): string {
	return nom
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((mot) => mot[0].toUpperCase())
		.join("")
}

/**
 * @param personne prénom et nom d'une fiche utilisateur
 * @returns le nom complet (« Léa Martin »)
 */
export function nomComplet(personne: Readonly<{ prenom: string; nom: string }>): string {
	return `${personne.prenom} ${personne.nom}`
}

/**
 * @param personne fiche utilisateur
 * @returns le nom complet suivi de l'email, pour distinguer deux homonymes dans un choix
 */
export function formaterUtilisateur(
	personne: Readonly<{ prenom: string; nom: string; email: string }>,
): string {
	return `${nomComplet(personne)} — ${personne.email}`
}

const FORMAT_HEURES = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })

/**
 * @param heures durée en heures
 * @returns la durée au format français (« 7,5 h »)
 */
export function formaterDuree(heures: number): string {
	return `${FORMAT_HEURES.format(heures)} h`
}

/**
 * @param jour date ISO (`2026-11-09`)
 * @returns le jour court (« lun. 09/11 »), pour un en-tête de colonne
 */
export function formaterJourCourt(jour: string): string {
	return format(parseISO(jour), "EEE dd/MM", { locale: fr })
}

/**
 * @param jour date ISO (`2026-11-09`)
 * @returns le jour en toutes lettres (« lundi 9 novembre 2026 »)
 */
export function formaterJourLong(jour: string): string {
	return format(parseISO(jour), "EEEE d MMMM yyyy", { locale: fr })
}

/**
 * @param mois mois ISO (`2026-10`)
 * @returns le mois en toutes lettres (« octobre 2026 »)
 */
export function formaterMois(mois: string): string {
	return format(parseISO(`${mois}-01`), "MMMM yyyy", { locale: fr })
}
