import "server-only"

import * as client from "openid-client"

import {
	MARGE_RENOUVELLEMENT_JETON_SECONDES,
	REVENDICATION_ROLES_PAR_DEFAUT,
	ROLE_ADMIN,
} from "@/lib/constantes"

import type { DonneesSession } from "./cookies"
import { configurationOidc } from "./oidc"

/**
 * Rôles portés par un jeton d'accès, lus dans la revendication indiquée (chemin pointé accepté,
 * ex. `realm_access.roles`). La signature n'est pas vérifiée : le jeton vient directement du
 * fournisseur, et ces rôles ne servent qu'à adapter l'affichage, l'API faisant les contrôles.
 *
 * @param jetonAcces   jeton d'accès JWT
 * @param revendication chemin de la revendication des rôles
 * @returns les rôles, ou une liste vide si le jeton ou la revendication sont illisibles
 */
export function rolesDuJeton(jetonAcces: string, revendication: string): string[] {
	const charge = jetonAcces.split(".")[1]
	if (!charge) {
		return []
	}
	try {
		const contenu: unknown = JSON.parse(Buffer.from(charge, "base64url").toString("utf8"))
		const valeur = revendication
			.split(".")
			.reduce<unknown>(
				(objet, cle) =>
					objet && typeof objet === "object" ? (objet as Record<string, unknown>)[cle] : undefined,
				contenu,
			)
		return Array.isArray(valeur) ? valeur.filter((role): role is string => typeof role === "string") : []
	} catch {
		return []
	}
}

/**
 * @param jetonAcces jeton d'accès JWT
 * @returns vrai si le jeton porte le rôle administrateur (revendication `OIDC_ROLES_CLAIM`)
 */
export function estAdministrateur(jetonAcces: string): boolean {
	const revendication = process.env.OIDC_ROLES_CLAIM || REVENDICATION_ROLES_PAR_DEFAUT
	return rolesDuJeton(jetonAcces, revendication).includes(ROLE_ADMIN)
}

/**
 * @param session    session (son expiration)
 * @param maintenant instant de référence, en millisecondes
 * @returns vrai si le jeton d'accès est expiré ou expire dans moins de
 *          {@link MARGE_RENOUVELLEMENT_JETON_SECONDES}
 */
export function expirationProche(
	session: Readonly<{ expiresAt?: number }>,
	maintenant: number = Date.now(),
): boolean {
	if (!session.expiresAt) {
		return true
	}
	return (session.expiresAt - MARGE_RENOUVELLEMENT_JETON_SECONDES) * 1000 <= maintenant
}

/**
 * Session à enregistrer d'après une réponse du point de terminaison `token` du fournisseur
 * (connexion ou renouvellement). Le nom et l'email viennent du jeton d'identité, à défaut de la
 * session précédente.
 *
 * @param reponse    réponse du fournisseur (jetons validés par `openid-client`)
 * @param precedente session en cours, lors d'un renouvellement
 * @param maintenant instant de référence, en millisecondes
 * @returns le contenu du cookie de session
 */
export function sessionDepuisJetons(
	reponse: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
	precedente?: DonneesSession,
	maintenant: number = Date.now(),
): DonneesSession {
	const identite = reponse.claims()
	const texte = (valeur: unknown) => (typeof valeur === "string" && valeur ? valeur : undefined)
	const email = texte(identite?.email) ?? precedente?.email ?? ""
	return {
		accessToken: reponse.access_token,
		refreshToken: reponse.refresh_token ?? precedente?.refreshToken,
		idToken: reponse.id_token ?? precedente?.idToken,
		expiresAt: Math.floor(maintenant / 1000) + (reponse.expires_in ?? 0),
		estAdmin: estAdministrateur(reponse.access_token),
		nom: texte(identite?.name) ?? texte(identite?.preferred_username) ?? precedente?.nom ?? email,
		email,
	}
}

/**
 * Renouvelle le jeton d'accès avec le refresh token. En cas d'échec (session fermée chez le
 * fournisseur, refresh token expiré, fournisseur injoignable), renvoie null : l'utilisateur sera
 * renvoyé vers la page de connexion.
 *
 * @param session session en cours
 * @returns la session avec les nouveaux jetons, ou null si le renouvellement est impossible
 */
export async function rafraichirJeton(session: DonneesSession): Promise<DonneesSession | null> {
	if (!session.refreshToken) {
		return null
	}
	try {
		const reponse = await client.refreshTokenGrant(await configurationOidc(), session.refreshToken)
		return sessionDepuisJetons(reponse, session)
	} catch (erreur) {
		// Ni jeton ni message du fournisseur dans le log : le type d'erreur seulement
		console.warn(
			"Renouvellement du jeton impossible :",
			erreur instanceof Error ? erreur.name : "inconnue",
		)
		return null
	}
}
