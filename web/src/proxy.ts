import { getIronSession, nextProxyCookies } from "iron-session"
import { type NextRequest, NextResponse } from "next/server"

import { type DonneesSession, optionsSession, sessionOuverte } from "@/lib/auth/cookies"
import { expirationProche, rafraichirJeton } from "@/lib/auth/jeton"
import { PAGE_CONNEXION } from "@/lib/constantes"

/**
 * Toute page exige une session valide, sauf la connexion et le retour du fournisseur : sans
 * session, redirection vers `/connexion?retour=<page demandée>`. C'est aussi le **seul endroit**
 * où le jeton d'accès est renouvelé avant son expiration : les nouveaux cookies sont écrits dans
 * la réponse et dans la requête transmise à la page, qui lit donc directement le jeton neuf.
 *
 * @param requete requête du navigateur
 * @returns la requête poursuivie (cookies éventuellement renouvelés), ou une redirection
 */
export async function proxy(requete: NextRequest): Promise<NextResponse> {
	const reponse = NextResponse.next()
	const session = await getIronSession<DonneesSession>(nextProxyCookies(requete, reponse), optionsSession())
	if (!sessionOuverte(session)) {
		return versConnexion(requete)
	}
	if (expirationProche(session)) {
		const renouvelee = await rafraichirJeton(session)
		if (!renouvelee) {
			// Session fermée chez le fournisseur : cookies effacés, nouvelle connexion demandée
			const redirection = versConnexion(requete)
			const ancienne = await getIronSession<DonneesSession>(
				nextProxyCookies(requete, redirection),
				optionsSession(),
			)
			ancienne.destroy()
			return redirection
		}
		Object.assign(session, renouvelee)
		await session.save()
	}
	return reponse
}

function versConnexion(requete: NextRequest): NextResponse {
	const url = new URL(PAGE_CONNEXION, requete.url)
	url.searchParams.set("retour", `${requete.nextUrl.pathname}${requete.nextUrl.search}`)
	return NextResponse.redirect(url)
}

export const config = {
	// Chaque exclusion est un segment entier (`/connexion`, `/connexion/…`) : une future page
	// `/connexions-actives` reste protégée. Chaîne littérale imposée par Next.js (analyse statique).
	matcher: ["/((?!(?:api/auth|connexion|_next/static|_next/image)(?:/|$)|favicon\\.ico$).*)"],
}
