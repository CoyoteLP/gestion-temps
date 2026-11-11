import "server-only"

import { getToken, type JWT } from "next-auth/jwt"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { auth } from "@/auth"
import { PAGE_CONNEXION } from "@/lib/constantes"

import { expirationProche, rafraichirJeton } from "./jeton"

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
