import type { MembreProjet, Projet, RoleProjet, Saisie } from "@/lib/api/modeles"
import { nomComplet } from "@/lib/format"

/** Rôles qui voient les saisies de tous les membres d'un projet et en clôturent les mois. */
export const ROLES_RESPONSABLES: readonly RoleProjet[] = ["MANAGER", "BACKUP"]

/**
 * @param role rôle de l'utilisateur dans un projet (null s'il n'en est pas membre)
 * @returns vrai pour un responsable ou un suppléant
 */
export function estResponsable(role: RoleProjet | null | undefined): boolean {
	return !!role && ROLES_RESPONSABLES.includes(role)
}

/**
 * Projets proposés dans la page Équipe : ceux dont l'utilisateur est responsable ou suppléant, tous
 * pour un administrateur ; triés par code.
 *
 * @param projets projets visibles (avec `monRole`)
 * @param estAdmin vrai pour un administrateur
 * @returns les projets proposés
 */
export function projetsPourEquipe(projets: readonly Projet[], estAdmin: boolean): Projet[] {
	return projets
		.filter((projet) => estAdmin || estResponsable(projet.monRole))
		.sort((a, b) => a.code.localeCompare(b.code, "fr"))
}

/** Total d'un membre (ou d'un ancien membre) sur le mois. */
export type TotalMembre = Readonly<{
	utilisateurId: number
	nom: string
	/** Rôle actuel ; null pour un auteur de saisies qui n'est plus membre. */
	role: RoleProjet | null
	total: number
}>

/** Total d'une tâche sur le mois. */
export type TotalTache = Readonly<{ tacheId: number; libelle: string; total: number }>

/** Récapitulatif du mois d'un projet. */
export type Recapitulatif = Readonly<{
	parMembre: readonly TotalMembre[]
	parTache: readonly TotalTache[]
	total: number
}>

/**
 * @param utilisateurId identifiant d'un auteur de saisies qui n'est plus membre
 * @returns son libellé (son nom n'est plus lisible)
 */
export const libelleAncienMembre = (utilisateurId: number) => `Ancien membre (n° ${utilisateurId})`

/**
 * Récapitulatif du mois : tous les membres actuels (0 h compris, pour repérer un oubli), triés par
 * nom, puis les auteurs de saisies qui ne sont plus membres ; les tâches saisies, triées par libellé ;
 * le total du projet.
 *
 * @param saisies      saisies du mois du projet
 * @param membres      membres actuels du projet
 * @param libelleTache libellé d'une tâche (même désactivée)
 * @returns le récapitulatif
 */
export function calculerRecapitulatif(
	saisies: readonly Saisie[],
	membres: readonly MembreProjet[],
	libelleTache: (tacheId: number) => string,
): Recapitulatif {
	const parUtilisateur = new Map<number, number>()
	const parTache = new Map<number, number>()
	let total = 0
	for (const saisie of saisies) {
		parUtilisateur.set(
			saisie.utilisateurId,
			(parUtilisateur.get(saisie.utilisateurId) ?? 0) + saisie.duree,
		)
		parTache.set(saisie.tacheId, (parTache.get(saisie.tacheId) ?? 0) + saisie.duree)
		total += saisie.duree
	}
	const actuels = membres
		.map((membre) => ({
			utilisateurId: membre.utilisateurId,
			nom: nomComplet(membre),
			role: membre.role,
			total: parUtilisateur.get(membre.utilisateurId) ?? 0,
		}))
		.sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
	const idsMembres = new Set(membres.map((membre) => membre.utilisateurId))
	const anciens = [...parUtilisateur.entries()]
		.filter(([utilisateurId]) => !idsMembres.has(utilisateurId))
		.sort(([a], [b]) => a - b)
		.map(([utilisateurId, totalAncien]) => ({
			utilisateurId,
			nom: libelleAncienMembre(utilisateurId),
			role: null,
			total: totalAncien,
		}))
	return {
		parMembre: [...actuels, ...anciens],
		parTache: [...parTache.entries()]
			.map(([tacheId, totalTache]) => ({ tacheId, libelle: libelleTache(tacheId), total: totalTache }))
			.sort((a, b) => a.libelle.localeCompare(b.libelle, "fr")),
		total,
	}
}
