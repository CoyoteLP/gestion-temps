import type { ReactNode } from "react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { CompteEnAttente } from "@/components/compte-en-attente"
import { ApiError } from "@/lib/api/erreurs"
import type { Utilisateur } from "@/lib/api/modeles"
import { lireMonCompte } from "@/lib/api/utilisateurs"
import { utilisateurCourant } from "@/lib/auth/session"

/**
 * Affiche la page seulement si l'API l'acceptera : administrateur, ou utilisateur dont la fiche est
 * active. Sinon, explique pourquoi (en attente de validation, inscription à finaliser). Lit la
 * session et l'API : à placer dans un `<Suspense>`.
 */
export async function GardeCompte({ children }: Readonly<{ children: ReactNode }>) {
	const utilisateur = await utilisateurCourant()
	if (utilisateur.estAdmin) {
		return children
	}
	let compte: Utilisateur | null
	try {
		compte = await lireMonCompte()
	} catch (erreur) {
		if (erreur instanceof ApiError) {
			return (
				<AlerteErreur
					message={erreur.message}
					identifiantCorrelation={erreur.identifiantCorrelation}
				/>
			)
		}
		throw erreur
	}
	if (compte?.actif) {
		return children
	}
	return <CompteEnAttente etat={compte ? "inactif" : "absent"} />
}
