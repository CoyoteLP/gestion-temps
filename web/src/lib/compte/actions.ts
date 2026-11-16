"use server"

import { refresh } from "next/cache"

import type { EtatAction } from "@/lib/actions/etat-action"
import { etatErreur, etatInvalide, versionValide } from "@/lib/actions/resultats"
import { ApiError, messageParDefaut } from "@/lib/api/erreurs"
import { enregistrerMonCompte, modifierMonProfil } from "@/lib/api/utilisateurs"
import { jetonAccesRenouvele } from "@/lib/auth/session"

import { schemaProfil, type Profil } from "./schema-profil"

/**
 * Modifie le nom et le prénom de l'utilisateur connecté. Le profil est revalidé ici : une Server
 * Action est appelable directement, sans passer par le formulaire.
 *
 * @param profil  nom et prénom saisis
 * @param version version de la fiche lue avant modification
 * @returns l'état à afficher ; en cas de succès, la page est rafraîchie
 */
export async function modifierProfil(profil: Profil, version: number): Promise<EtatAction<keyof Profil>> {
	const resultat = schemaProfil.safeParse(profil)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	if (!versionValide(version)) {
		return { statut: "erreur", message: "Version de la fiche invalide : rechargez la page." }
	}
	try {
		await modifierMonProfil({ ...resultat.data, version })
	} catch (erreur) {
		return etatErreur(erreur)
	}
	refresh()
	return { statut: "succes" }
}

/**
 * Crée la fiche de l'utilisateur connecté (inscription non aboutie à la connexion, par exemple
 * parce que l'email n'était pas encore vérifié). Le jeton est d'abord renouvelé : celui de la
 * connexion porte l'état du compte à ce moment-là (`email_verified: false`), et l'API le
 * refuserait encore. Une fiche déjà existante vaut succès.
 *
 * @returns l'état à afficher ; en cas de succès, la page est rafraîchie
 */
export async function finaliserInscription(): Promise<EtatAction<never>> {
	const jeton = await jetonAccesRenouvele()
	if (!jeton) {
		return { statut: "erreur", message: messageParDefaut(401) }
	}
	try {
		await enregistrerMonCompte(jeton)
	} catch (erreur) {
		if (!(erreur instanceof ApiError && erreur.statut === 409)) {
			return etatErreur(erreur)
		}
	}
	refresh()
	return { statut: "succes" }
}
