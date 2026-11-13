import { z } from "zod"

import type { RoleProjet } from "@/lib/api/modeles"

/**
 * Libellés des rôles d'un membre de projet, dans l'ordre du choix. Responsable et suppléant
 * consultent les saisies de tous les membres et clôturent les mois ; un contributeur voit le projet
 * et y saisit son temps.
 */
export const LIBELLES_ROLE_PROJET: Record<RoleProjet, string> = {
	MANAGER: "Responsable",
	BACKUP: "Suppléant",
	CONTRIBUTEUR: "Contributeur",
}

/** Rôle proposé à l'ajout d'un membre : le plus courant, celui qui saisit seulement son temps. */
export const ROLE_PROJET_PAR_DEFAUT: RoleProjet = "CONTRIBUTEUR"

const ROLES_PROJET = Object.keys(LIBELLES_ROLE_PROJET) as [RoleProjet, ...RoleProjet[]]

/** Valeurs du formulaire d'un membre, avec les contraintes de `MembreProjetRequest` (API). */
export const schemaMembre = z.object({
	utilisateurId: z.number().int().positive("Choisissez un utilisateur"),
	role: z.enum(ROLES_PROJET, "Choisissez un rôle"),
})

export type ValeursMembre = z.infer<typeof schemaMembre>
