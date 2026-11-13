import { z } from "zod"

import type { RoleProjet } from "@/lib/api/modeles"

/** Libellés des rôles d'un membre de projet, dans l'ordre du choix. */
export const LIBELLES_ROLE_PROJET: Record<RoleProjet, string> = {
	MANAGER: "Responsable",
	BACKUP: "Suppléant",
}

const ROLES_PROJET = Object.keys(LIBELLES_ROLE_PROJET) as [RoleProjet, ...RoleProjet[]]

/** Valeurs du formulaire d'un membre, avec les contraintes de `MembreProjetRequest` (API). */
export const schemaMembre = z.object({
	utilisateurId: z.number().int().positive("Choisissez un utilisateur"),
	role: z.enum(ROLES_PROJET, "Choisissez un rôle"),
})

export type ValeursMembre = z.infer<typeof schemaMembre>
