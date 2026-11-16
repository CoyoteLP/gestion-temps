import type { Projet, Tache } from "@/lib/api/modeles"

/** Projet proposé ou affiché dans une saisie. */
export type ProjetSaisie = Readonly<{
	id: number
	code: string
	nom: string
	dateDebut: string | null
	dateFin: string | null
	/** L'utilisateur peut y créer une saisie : il en est membre et le projet est actif. */
	ouvert: boolean
}>

/** Tâche proposée ou affichée dans une saisie. */
export type TacheSaisie = Readonly<{ id: number; projetId: number; libelle: string; actif: boolean }>

/** Données du dialogue de saisie, préparées par le serveur (sérialisables). */
export type OptionsSaisie = Readonly<{
	projets: readonly ProjetSaisie[]
	taches: readonly TacheSaisie[]
	/** Heures déjà saisies pour chaque jour de la semaine affichée (0 pour un jour vide). */
	cumulParJour: Readonly<Record<string, number>>
	/** Mois clôturés, clés `projetId:AAAA-MM`. */
	clotures: readonly string[]
}>

/**
 * @param projets projets visibles (avec `monRole`)
 * @returns les projets pour la saisie, ouverts s'il en est membre et qu'ils sont actifs
 */
export function projetsPourSaisie(projets: readonly Projet[]): ProjetSaisie[] {
	return projets.map((projet) => ({
		id: projet.id,
		code: projet.code,
		nom: projet.nom,
		dateDebut: projet.dateDebut,
		dateFin: projet.dateFin,
		ouvert: projet.actif && projet.monRole !== null,
	}))
}

/**
 * @param taches tâches visibles
 * @returns les tâches pour la saisie
 */
export function tachesPourSaisie(taches: readonly Tache[]): TacheSaisie[] {
	return taches.map((tache) => ({
		id: tache.id,
		projetId: tache.projetId,
		libelle: tache.libelle,
		actif: tache.actif,
	}))
}

/**
 * @param projets projets connus
 * @param taches  tâches connues
 * @returns une fonction qui donne le libellé d'une tâche (« PJT001 · Dev »), même désactivée ;
 *          « Tâche n° 12 » si elle n'est plus visible
 */
export function libellesDesTaches(
	projets: readonly Pick<ProjetSaisie, "id" | "code">[],
	taches: readonly TacheSaisie[],
): (tacheId: number) => string {
	const codes = new Map(projets.map((projet) => [projet.id, projet.code]))
	const libelles = new Map(
		taches.map((tache) => [tache.id, `${codes.get(tache.projetId) ?? "?"} · ${tache.libelle}`]),
	)
	return (tacheId) => libelles.get(tacheId) ?? `Tâche n° ${tacheId}`
}
