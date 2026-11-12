import "server-only"

import { getToken, type JWT } from "next-auth/jwt"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { auth, unstable_update } from "@/auth"
import { PAGE_CONNEXION } from "@/lib/constantes"

import { expirationProche, type MiseAJourJetons, rafraichirJeton } from "./jeton"

/** Utilisateur connecté, tel que l'interface l'affiche (aucun jeton). */
export type UtilisateurConnecte = {
	nom: string
	email: string
	estAdmin: boolean
}

/**
 * Lit le contenu chiffré du cookie de session de la requête en cours (nom sécurisé `__Secure-`
 * en HTTPS, nom simple en HTTP local).
 *
 * @returns le contenu de la session, ou null sans session valide
 */
export async function lireJeton(): Promise<JWT | null> {
	const requete = { headers: await headers() }
	const secret = process.env.AUTH_SECRET
	return (
		(await getToken({ req: requete, secret, secureCookie: true })) ??
		(await getToken({ req: requete, secret, secureCookie: false }))
	)
}

/**
 * Jeton d'accès à transmettre à l'API, renouvelé s'il expire (cas d'une requête qui suit une
 * longue inactivité : le proxy a déjà renouvelé le cookie, mais la requête porte encore l'ancien).
 * Lu une seule fois par rendu. Sans session valide, redirige vers la page de connexion.
 *
 * @returns le jeton d'accès
 */
export const jetonAcces = cache(async (): Promise<string> => {
	let jeton = await lireJeton()
	if (jeton && !jeton.erreur && expirationProche(jeton)) {
		jeton = await rafraichirJeton(jeton)
	}
	if (!jeton?.accessToken || jeton.erreur) {
		redirect(PAGE_CONNEXION)
	}
	return jeton.accessToken
})

/**
 * @returns l'utilisateur connecté ; sans session valide, redirige vers la page de connexion
 */
export const utilisateurCourant = cache(async (): Promise<UtilisateurConnecte> => {
	const session = await auth()
	if (!session?.user || session.erreur) {
		redirect(PAGE_CONNEXION)
	}
	return {
		nom: session.user.name ?? session.user.email ?? "",
		email: session.user.email ?? "",
		estAdmin: session.estAdmin,
	}
})

/**
 * Renouvelle le jeton d'accès auprès du fournisseur, même s'il n'a pas expiré, et l'enregistre
 * dans le cookie de session. Utile quand le compte a changé chez le fournisseur depuis la
 * connexion (email vérifié entre-temps) : le nouveau jeton porte ses revendications à jour.
 * Réservé aux Server Actions (le cookie n'est modifiable qu'à cet endroit).
 *
 * @returns le nouveau jeton d'accès, ou null sans session ou si le fournisseur refuse
 */
export async function jetonAccesRenouvele(): Promise<string | null> {
	const jeton = await lireJeton()
	if (!jeton || jeton.erreur) {
		return null
	}
	const renouvele = await rafraichirJeton(jeton)
	if (renouvele.erreur || !renouvele.accessToken || !renouvele.expiresAt) {
		return null
	}
	const donnees: MiseAJourJetons = {
		jetonsRenouveles: {
			accessToken: renouvele.accessToken,
			expiresAt: renouvele.expiresAt,
			estAdmin: renouvele.estAdmin ?? false,
			refreshToken: renouvele.refreshToken,
			idToken: renouvele.idToken,
		},
	}
	// Données internes au serveur (unstable_update n'émet aucune requête réseau) ; son type
	// n'accepte que des champs de session, d'où la conversion
	await unstable_update(donnees as Parameters<typeof unstable_update>[0])
	return renouvele.accessToken
}
