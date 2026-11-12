import { z } from "zod"

import { LONGUEUR_MAX_NOM } from "@/lib/constantes"

const champNom = (libelle: string) =>
	z
		.string()
		.trim()
		.min(1, `${libelle} est obligatoire`)
		.max(LONGUEUR_MAX_NOM, `${libelle} ne doit pas dépasser ${LONGUEUR_MAX_NOM} caractères`)

/** Champs modifiables du profil, avec les bornes de `ProfilRequest` (API). */
export const schemaProfil = z.object({
	nom: champNom("Le nom"),
	prenom: champNom("Le prénom"),
})

export type Profil = z.infer<typeof schemaProfil>
