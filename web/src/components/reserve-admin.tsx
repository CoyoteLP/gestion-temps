import type { ReactNode } from "react"

import { utilisateurCourant } from "@/lib/auth/session"

/**
 * Affiche son contenu (actions d'administration) au seul administrateur. Masquer n'est qu'un
 * confort : l'API refuse de toute façon les appels non autorisés. Lit la session : à placer dans
 * un `<Suspense>`.
 */
export async function ReserveAdmin({ children }: Readonly<{ children: ReactNode }>) {
	const utilisateur = await utilisateurCourant()
	return utilisateur.estAdmin ? children : null
}
