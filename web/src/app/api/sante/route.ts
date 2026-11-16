import { connection, NextResponse } from "next/server"

/**
 * Sonde de vivacité, pour l'orchestrateur : le serveur du front répond. Ne vérifie rien d'autre
 * (l'API ou le fournisseur indisponibles ne justifient pas de redémarrer le front).
 *
 * @returns 200 `{"statut":"UP"}`
 */
export async function GET(): Promise<NextResponse> {
	// Réponse à chaque appel, jamais prérendue au build
	await connection()
	return NextResponse.json({ statut: "UP" }, { headers: { "Cache-Control": "no-store" } })
}
