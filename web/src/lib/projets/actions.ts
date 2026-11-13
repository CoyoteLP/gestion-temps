"use server"

import type { EtatAction } from "@/lib/actions/etat-action"
import {
	etatDonneesInvalides,
	etatErreur,
	etatInvalide,
	identifiantValide,
	versionValide,
} from "@/lib/actions/resultats"
import { ApiError } from "@/lib/api/erreurs"
import { creerProjet, modifierProjet, supprimerProjet } from "@/lib/api/projets"

import { schemaProjet, type ValeursProjet, versRequeteProjet } from "./schema-projet"

type EtatProjet = EtatAction<keyof ValeursProjet>

/**
 * Crée un projet (administrateur). Les valeurs sont revalidées ici : une Server Action est
 * appelable directement, sans passer par le formulaire.
 *
 * @param valeurs valeurs saisies
 * @returns succès avec l'identifiant du projet créé, que le formulaire ouvre ; un code déjà
 *          utilisé (409) est rattaché au champ code
 */
export async function creerProjetAction(valeurs: ValeursProjet): Promise<EtatProjet> {
	const resultat = schemaProjet.safeParse(valeurs)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	try {
		const projet = await creerProjet(versRequeteProjet(resultat.data))
		return { statut: "succes", id: projet.id }
	} catch (erreur) {
		// Sans version, un 409 en création ne peut venir que d'un code (ou d'une contrainte) en double
		if (erreur instanceof ApiError && erreur.statut === 409) {
			return { statut: "invalide", erreurs: { code: erreur.message } }
		}
		return etatErreur(erreur)
	}
}

/**
 * Modifie un projet (administrateur).
 *
 * @param id      identifiant du projet
 * @param valeurs valeurs saisies
 * @param version version du projet lue avant modification
 * @returns succès avec l'identifiant du projet ; 409 (modifié entre-temps ou code déjà utilisé,
 *          précisé par le message de l'API) → conflit
 */
export async function modifierProjetAction(
	id: number,
	valeurs: ValeursProjet,
	version: number,
): Promise<EtatProjet> {
	const resultat = schemaProjet.safeParse(valeurs)
	if (!resultat.success) {
		return etatInvalide(resultat.error)
	}
	if (!identifiantValide(id) || !versionValide(version)) {
		return etatDonneesInvalides()
	}
	try {
		await modifierProjet(id, versRequeteProjet(resultat.data, version))
	} catch (erreur) {
		return etatErreur(erreur)
	}
	return { statut: "succes", id }
}

/**
 * Supprime un projet sans tâche (administrateur). Le composant revient ensuite à la liste.
 *
 * @param id identifiant du projet
 * @returns succès, ou le refus de l'API (projet qui a des tâches : à désactiver plutôt)
 */
export async function supprimerProjetAction(id: number): Promise<EtatAction<never>> {
	if (!identifiantValide(id)) {
		return etatDonneesInvalides()
	}
	try {
		await supprimerProjet(id)
	} catch (erreur) {
		return etatErreur(erreur)
	}
	return { statut: "succes" }
}
