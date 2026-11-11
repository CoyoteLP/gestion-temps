import "server-only"

import type { JWT } from "next-auth/jwt"

import {
	MARGE_RENOUVELLEMENT_JETON_SECONDES,
	REVENDICATION_ROLES_PAR_DEFAUT,
	ROLE_ADMIN,
} from "@/lib/constantes"

import { configurationOidc } from "./oidc"

/** Réponse du point de terminaison `token` du fournisseur OIDC. */
type ReponseJeton = {
	access_token: string
	expires_in: number
	refresh_token?: string
	id_token?: string
}

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
 * @returns vrai si le jeton porte le rôle administrateur
 */
export function estAdministrateur(jetonAcces: string): boolean {
	const revendication = process.env.AUTH_ROLES_CLAIM || REVENDICATION_ROLES_PAR_DEFAUT
	return rolesDuJeton(jetonAcces, revendication).includes(ROLE_ADMIN)
}

/**
 * @param jeton       contenu de la session
 * @param maintenant  instant de référence, en millisecondes
 * @returns vrai si le jeton d'accès est expiré ou expire dans moins de
 *          {@link MARGE_RENOUVELLEMENT_JETON_SECONDES}
 */
export function expirationProche(jeton: JWT, maintenant: number = Date.now()): boolean {
	if (!jeton.expiresAt) {
		return true
	}
	return (jeton.expiresAt - MARGE_RENOUVELLEMENT_JETON_SECONDES) * 1000 <= maintenant
}

/**
 * Renouvelle le jeton d'accès avec le refresh token. En cas d'échec (session fermée chez le
 * fournisseur, refresh token expiré), la session est marquée `erreur` : l'utilisateur sera renvoyé
 * vers la page de connexion.
 *
 * @param jeton contenu de la session
 * @returns la session avec les nouveaux jetons, ou marquée en erreur
 */
export async function rafraichirJeton(jeton: JWT): Promise<JWT> {
	const enErreur: JWT = { ...jeton, erreur: "RenouvellementImpossible" }
	if (!jeton.refreshToken) {
		return enErreur
	}
	try {
		const { token_endpoint } = await configurationOidc()
		const corps = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: jeton.refreshToken,
			client_id: process.env.AUTH_KEYCLOAK_ID ?? "",
		})
		if (process.env.AUTH_KEYCLOAK_SECRET) {
			corps.set("client_secret", process.env.AUTH_KEYCLOAK_SECRET)
		}
		const reponse = await fetch(token_endpoint, { method: "POST", body: corps, cache: "no-store" })
		if (!reponse.ok) {
			console.warn(`Renouvellement du jeton refusé par le fournisseur OIDC (HTTP ${reponse.status})`)
			return enErreur
		}
		const nouveau = (await reponse.json()) as ReponseJeton
		return {
			...jeton,
			accessToken: nouveau.access_token,
			expiresAt: Math.floor(Date.now() / 1000) + nouveau.expires_in,
			refreshToken: nouveau.refresh_token ?? jeton.refreshToken,
			idToken: nouveau.id_token ?? jeton.idToken,
			estAdmin: estAdministrateur(nouveau.access_token),
			erreur: undefined,
		}
	} catch (erreur) {
		console.warn(
			"Renouvellement du jeton impossible :",
			erreur instanceof Error ? erreur.name : "inconnue",
		)
		return enErreur
	}
}
