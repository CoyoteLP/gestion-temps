import { connection, NextResponse } from "next/server"

import { apiJoignable } from "@/lib/api/client"
import { fournisseurJoignable } from "@/lib/auth/oidc"
import { DELAI_SONDE_MS } from "@/lib/constantes"

/**
 * Sonde de disponibilité, pour l'orchestrateur : le front peut servir des pages, c'est-à-dire
 * joindre l'API et le fournisseur OIDC (contrôlés en parallèle, 2 s au plus chacun). La réponse ne
 * dit pas lequel manque (pas de détail technique sur une adresse publique) : la cause est
 * journalisée.
 *
 * @returns 200 `{"statut":"UP"}`, ou 503 `{"statut":"DOWN"}`
 */
export async function GET(): Promise<NextResponse> {
	await connection()
	const [api, fournisseur] = await Promise.all([
		apiJoignable(DELAI_SONDE_MS),
		fournisseurJoignable(DELAI_SONDE_MS),
	])
	const disponible = api && fournisseur
	if (!disponible) {
		console.warn(
			`Front indisponible : API ${api ? "joignable" : "injoignable"}, fournisseur OIDC ${fournisseur ? "joignable" : "injoignable"}`,
		)
	}
	return NextResponse.json(
		{ statut: disponible ? "UP" : "DOWN" },
		{ status: disponible ? 200 : 503, headers: { "Cache-Control": "no-store" } },
	)
}
