import { getIronSession, nextProxyCookies } from "iron-session"
import { type NextRequest, NextResponse } from "next/server"

import { cookiesSecurises, type DonneesSession, optionsSession, sessionOuverte } from "@/lib/auth/cookies"
import { expirationProche, rafraichirJeton } from "@/lib/auth/jeton"
import { PAGE_CONNEXION } from "@/lib/constantes"
import { EN_TETE_NONCE, enTeteHsts, genererNonce, politiqueContenu } from "@/lib/securite/en-tetes"

/** Accessibles sans session : la page de connexion et le retour du fournisseur OIDC. */
const CHEMINS_PUBLICS = /^\/(?:connexion|api\/auth)(?:\/|$)/

/**
 * Pour chaque requête : un nonce et la politique de sécurité du contenu (CSP) qui l'autorise,
 * transmis au rendu (Next.js l'applique à ses scripts) et posés sur la réponse, avec HSTS en HTTPS.
 *
 * Hors connexion, toute page exige une session valide : sans elle, redirection vers
 * `/connexion?retour=<page demandée>`. C'est aussi le **seul endroit** où le jeton d'accès est
 * renouvelé avant son expiration : les nouveaux cookies sont posés sur la réponse et transmis à la
 * page, qui lit donc directement le jeton neuf.
 *
 * @param requete requête du navigateur
 * @returns la requête poursuivie (en-têtes de sécurité, cookies éventuellement renouvelés), ou une
 *          redirection vers la connexion
 */
export async function proxy(requete: NextRequest): Promise<NextResponse> {
	const nonce = genererNonce()
	const csp = politiqueContenu({
		nonce,
		developpement: process.env.NODE_ENV === "development",
		https: cookiesSecurises(),
		emetteurOidc: process.env.OIDC_ISSUER_URI,
	})
	// Cookies renouvelés : écrits sur cette réponse provisoire et dans la requête
	const renouvellement = NextResponse.next()

	if (!CHEMINS_PUBLICS.test(requete.nextUrl.pathname)) {
		const refus = await verifierSession(requete, renouvellement)
		if (refus) {
			return avecSecurite(refus, csp)
		}
	}

	// Requête transmise au rendu : CSP (d'où Next.js tire le nonce), nonce et cookies à jour
	const entetes = new Headers(requete.headers)
	entetes.set("content-security-policy", csp)
	entetes.set(EN_TETE_NONCE, nonce)
	const reponse = NextResponse.next({ request: { headers: entetes } })
	for (const cookie of renouvellement.cookies.getAll()) {
		reponse.cookies.set(cookie)
	}
	return avecSecurite(reponse, csp)
}

/**
 * Vérifie la session et renouvelle le jeton qui expire.
 *
 * @returns null si la requête peut continuer, sinon la redirection vers la connexion
 */
async function verifierSession(requete: NextRequest, reponse: NextResponse): Promise<NextResponse | null> {
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
	return null
}

function versConnexion(requete: NextRequest): NextResponse {
	const url = new URL(PAGE_CONNEXION, requete.url)
	url.searchParams.set("retour", `${requete.nextUrl.pathname}${requete.nextUrl.search}`)
	return NextResponse.redirect(url)
}

function avecSecurite(reponse: NextResponse, csp: string): NextResponse {
	reponse.headers.set("Content-Security-Policy", csp)
	const hsts = enTeteHsts(process.env.APP_URL)
	if (hsts) {
		reponse.headers.set("Strict-Transport-Security", hsts)
	}
	return reponse
}

export const config = {
	// Toutes les pages, connexion comprise (CSP) ; seuls les fichiers statiques sont exclus. Chaque
	// exclusion est un segment entier. Chaîne littérale imposée par Next.js (analyse statique).
	matcher: ["/((?!(?:_next/static|_next/image)(?:/|$)|favicon\\.ico$).*)"],
}
