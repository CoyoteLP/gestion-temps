import { LONGUEUR_MAX_FILTRE } from "@/lib/constantes"
import { lirePage } from "@/lib/pagination"

/** Option d'un filtre à choix (statut, rôle) : valeur dans l'URL et libellé affiché. */
export type OptionFiltre = Readonly<{ valeur: string; libelle: string }>

/**
 * Filtre d'une colonne, selon son type : texte « contient », ou choix dans une liste. Un filtre à
 * choix sans valeur par défaut a une option « Tous » de valeur vide (paramètre absent de l'URL) ;
 * avec une valeur par défaut (écran Utilisateurs : « En attente »), « Tous » est une valeur explicite.
 */
export type FiltreColonne =
	| Readonly<{ type: "texte" }>
	| Readonly<{ type: "choix"; options: readonly OptionFiltre[]; parDefaut?: string }>

/** Colonne d'une liste : la même clé sert au tri et au filtre (`tri=nom`, `nom=…`). */
export type ColonneListe = Readonly<{
	cle: string
	libelle: string
	triable?: boolean
	filtre?: FiltreColonne
	/** Classes de la cellule (visibilité selon la largeur d'écran, marges), reprises par les lignes. */
	classe?: string
}>

/**
 * Liste triable et filtrable. Le préfixe sépare dans l'URL les paramètres de deux listes d'une même
 * page (fiche projet : tâches sans préfixe, membres avec `membres.`).
 */
export type DefinitionListe = Readonly<{
	prefixe: string
	colonnes: readonly ColonneListe[]
}>

export type SensTri = "asc" | "desc"

/** État d'une liste lu dans l'URL : page, tri et valeur de chaque filtre (vide = non filtré). */
export type EtatListe = Readonly<{
	page: number
	tri: string | null
	sens: SensTri
	filtres: Readonly<Record<string, string>>
}>

/** Paramètres de l'URL, tels que Next.js les fournit (`searchParams`). */
export type ParametresUrl = Readonly<Record<string, string | string[] | undefined>>

const premiere = (valeur: string | string[] | undefined) => (Array.isArray(valeur) ? valeur[0] : valeur)

/**
 * État d'une liste d'après l'URL. Seules les valeurs admises sont gardées (colonne triable, sens
 * connu, option existante, texte de longueur raisonnable) : une valeur inconnue est ignorée plutôt
 * que de provoquer un refus de l'API.
 *
 * @param definition colonnes et préfixe de la liste
 * @param parametres paramètres de l'URL
 * @returns l'état de la liste
 */
export function lireEtatListe(definition: DefinitionListe, parametres: ParametresUrl): EtatListe {
	const lire = (nom: string) => premiere(parametres[definition.prefixe + nom])
	const triDemande = lire("tri")
	const tri = definition.colonnes.some((colonne) => colonne.triable && colonne.cle === triDemande)
		? (triDemande ?? null)
		: null
	const filtres: Record<string, string> = {}
	for (const colonne of definition.colonnes) {
		if (colonne.filtre) {
			filtres[colonne.cle] = valeurFiltre(colonne.filtre, lire(colonne.cle))
		}
	}
	return {
		page: lirePage(lire("page")),
		tri,
		sens: lire("sens") === "desc" ? "desc" : "asc",
		filtres,
	}
}

function valeurFiltre(filtre: FiltreColonne, valeur: string | undefined): string {
	if (filtre.type === "texte") {
		const texte = valeur?.trim() ?? ""
		return texte.length <= LONGUEUR_MAX_FILTRE ? texte : ""
	}
	return filtre.options.some((option) => option.valeur === valeur)
		? (valeur ?? "")
		: (filtre.parDefaut ?? "")
}

/**
 * @param definition colonnes de la liste
 * @param etat       état de la liste
 * @returns vrai si un filtre s'écarte de sa valeur par défaut (pour le message « aucun résultat »)
 */
export function aDesFiltres(definition: DefinitionListe, etat: EtatListe): boolean {
	return definition.colonnes.some(
		(colonne) =>
			colonne.filtre &&
			(etat.filtres[colonne.cle] ?? "") !==
				(colonne.filtre.type === "choix" ? (colonne.filtre.parDefaut ?? "") : ""),
	)
}

/**
 * Lien vers la même page avec des paramètres de la liste modifiés : les paramètres des autres
 * listes sont conservés, la page de la liste revient à 1.
 *
 * @param chemin      chemin de la page
 * @param parametres  paramètres actuels de l'URL
 * @param prefixe     préfixe de la liste
 * @param changements paramètres de la liste à modifier (sans préfixe) ; null ou vide = retiré
 * @returns le lien relatif
 */
export function lienListe(
	chemin: string,
	parametres: ParametresUrl | URLSearchParams,
	prefixe: string,
	changements: Readonly<Record<string, string | null>>,
): string {
	const resultat = new URLSearchParams()
	const entrees =
		parametres instanceof URLSearchParams
			? [...parametres.entries()]
			: Object.entries(parametres).flatMap(([nom, valeur]) =>
					valeur === undefined
						? []
						: (Array.isArray(valeur) ? valeur : [valeur]).map((v) => [nom, v]),
				)
	for (const [nom, valeur] of entrees) {
		const modifie = nom.startsWith(prefixe) && Object.hasOwn(changements, nom.slice(prefixe.length))
		if (nom !== `${prefixe}page` && !modifie) {
			resultat.append(nom, valeur)
		}
	}
	for (const [nom, valeur] of Object.entries(changements)) {
		if (valeur) {
			resultat.set(prefixe + nom, valeur)
		}
	}
	const requete = resultat.toString()
	return requete ? `${chemin}?${requete}` : chemin
}

/**
 * Valeur à envoyer à l'API pour un filtre de statut (`actif`, `inactif`, autre = tous).
 *
 * @param valeur valeur du filtre dans l'état de la liste
 * @returns true, false, ou undefined (non filtré)
 */
export function versActif(valeur: string | undefined): boolean | undefined {
	if (valeur === "actif") {
		return true
	}
	return valeur === "inactif" ? false : undefined
}
