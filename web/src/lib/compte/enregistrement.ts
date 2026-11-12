import "server-only"

import { ApiError } from "@/lib/api/erreurs"
import { enregistrerMonCompte } from "@/lib/api/utilisateurs"
import { estAdministrateur } from "@/lib/auth/jeton"

/**
 * Crée la fiche de l'utilisateur qui vient de se connecter (`POST /api/utilisateurs/moi`), sauf
 * pour un administrateur, qui n'en a pas besoin. Une fiche déjà existante (409) est le cas normal.
 * Tout autre échec (email non vérifié, API injoignable…) est journalisé sans bloquer la connexion :
 * l'utilisateur peut réessayer depuis l'encadré « Inscription à finaliser ».
 *
 * @param jetonAcces jeton d'accès reçu du fournisseur à la connexion
 */
export async function enregistrerALaConnexion(jetonAcces: string | undefined): Promise<void> {
	if (!jetonAcces || estAdministrateur(jetonAcces)) {
		return
	}
	try {
		await enregistrerMonCompte(jetonAcces)
	} catch (erreur) {
		if (erreur instanceof ApiError) {
			if (erreur.statut !== 409) {
				// Ni le message (il peut contenir l'email) ni le jeton : statut et référence seulement
				console.warn(
					`Enregistrement du compte à la connexion impossible (HTTP ${erreur.statut}) [${erreur.identifiantCorrelation}]`,
				)
			}
			return
		}
		console.warn(
			"Enregistrement du compte à la connexion impossible :",
			erreur instanceof Error ? erreur.name : "inconnue",
		)
	}
}
