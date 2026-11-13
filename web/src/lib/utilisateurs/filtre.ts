/** Filtres de la liste des utilisateurs (`?statut=`), dans l'ordre d'affichage. */
export const FILTRES_UTILISATEURS = [
	{ valeur: "en-attente", libelle: "En attente", actif: false },
	{ valeur: "actifs", libelle: "Actifs", actif: true },
	{ valeur: "tous", libelle: "Tous", actif: undefined },
] as const

export type FiltreUtilisateurs = (typeof FILTRES_UTILISATEURS)[number]

/**
 * Filtre lu dans l'URL. Les comptes en attente de validation sont affichés par défaut (et pour une
 * valeur inconnue) : c'est la raison d'être de l'écran. « En attente » regroupe les inscriptions
 * non validées et les fiches désactivées : l'API ne les distingue pas.
 *
 * @param valeur paramètre `statut` de l'URL
 * @returns le filtre retenu
 */
export function lireFiltreUtilisateurs(valeur: string | string[] | undefined): FiltreUtilisateurs {
	const texte = Array.isArray(valeur) ? valeur[0] : valeur
	return FILTRES_UTILISATEURS.find((filtre) => filtre.valeur === texte) ?? FILTRES_UTILISATEURS[0]
}
