import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { connection, type NextRequest, NextResponse } from "next/server"
import * as client from "openid-client"

import {
	type DonneesConnexion,
	type DonneesSession,
	optionsConnexion,
	optionsSession,
} from "@/lib/auth/cookies"
import { CODES_ERREUR_CONNEXION } from "@/lib/auth/erreurs-connexion"
import { sessionDepuisJetons } from "@/lib/auth/jeton"
import { configurationOidc } from "@/lib/auth/oidc"
import { origineApplication } from "@/lib/auth/origine"
import { cheminDeRetour } from "@/lib/auth/redirection"
import { enregistrerALaConnexion } from "@/lib/compte/enregistrement"
import { CHEMIN_RAPPEL_OIDC, PAGE_CONNEXION } from "@/lib/constantes"

/**
 * Retour du fournisseur OIDC après la connexion (`redirect_uri`). Le code est échangé contre les
 * jetons après vérification du `state`, du vérificateur PKCE et du `nonce` gardés dans le cookie
 * temporaire, et du jeton d'identité (émetteur, audience, expiration) par `openid-client`. La
 * session est alors enregistrée, la fiche d'un nouvel inscrit créée, et l'utilisateur renvoyé sur
 * la page demandée. Tout échec renvoie à la page de connexion avec un code d'erreur.
 *
 * @param requete requête du navigateur, redirigé par le fournisseur
 * @returns une redirection vers la page demandée ou vers la page de connexion
 */
export async function GET(requete: NextRequest): Promise<NextResponse> {
	// Propre à chaque requête (cookies, code du fournisseur) : jamais prérendue au build
	await connection()
	const origine = await origineApplication()
	const magasin = await cookies()
	const temporaire = await getIronSession<DonneesConnexion>(magasin, optionsConnexion())
	const { verificateur, etat, nonce, retour } = temporaire
	// Usage unique : le cookie temporaire est effacé quoi qu'il arrive
	temporaire.destroy()
	if (!verificateur || !etat || !nonce) {
		return echec(origine, CODES_ERREUR_CONNEXION.expiree)
	}

	let session: DonneesSession
	try {
		// Adresse publique : celle envoyée au fournisseur comme `redirect_uri`
		const urlCourante = new URL(`${origine}${CHEMIN_RAPPEL_OIDC}${requete.nextUrl.search}`)
		const reponse = await client.authorizationCodeGrant(await configurationOidc(), urlCourante, {
			pkceCodeVerifier: verificateur,
			expectedState: etat,
			expectedNonce: nonce,
			idTokenExpected: true,
		})
		session = sessionDepuisJetons(reponse)
	} catch (erreur) {
		if (erreur instanceof client.AuthorizationResponseError && erreur.error === "access_denied") {
			return echec(origine, CODES_ERREUR_CONNEXION.refus)
		}
		if (stateIncorrect(erreur)) {
			// Autre connexion lancée entre-temps (deux onglets) : simple connexion à recommencer
			return echec(origine, CODES_ERREUR_CONNEXION.expiree)
		}
		// Type et code d'erreur seulement : ni jeton ni réponse du fournisseur dans le log
		const code = erreur instanceof Error && "code" in erreur ? String(erreur.code) : ""
		console.warn(
			"Retour de connexion refusé :",
			erreur instanceof Error ? `${erreur.name} ${code}` : "inconnue",
		)
		return echec(origine, CODES_ERREUR_CONNEXION.fournisseur)
	}

	const cookieSession = await getIronSession<DonneesSession>(magasin, optionsSession())
	Object.assign(cookieSession, session)
	await cookieSession.save()
	// Première connexion d'un inscrit : création de sa fiche (inactive), sans bloquer la connexion
	await enregistrerALaConnexion(session.accessToken)
	return NextResponse.redirect(new URL(cheminDeRetour(retour), origine))
}

/**
 * Le `state` du retour ne correspond pas à celui de la connexion en cours : `openid-client` lève
 * alors une erreur `OAUTH_INVALID_RESPONSE` qui nomme le paramètre `state`.
 */
function stateIncorrect(erreur: unknown): boolean {
	return (
		erreur instanceof Error &&
		"code" in erreur &&
		erreur.code === "OAUTH_INVALID_RESPONSE" &&
		erreur.message.includes('"state"')
	)
}

function echec(origine: string, code: string): NextResponse {
	return NextResponse.redirect(new URL(`${PAGE_CONNEXION}?erreur=${code}`, origine))
}
