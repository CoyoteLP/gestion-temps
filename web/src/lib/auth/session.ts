import "server-only"

import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"

import { PAGE_CONNEXION } from "@/lib/constantes"

import { type DonneesSession, optionsSession, sessionOuverte } from "./cookies"
import { rafraichirJeton } from "./jeton"

/** Utilisateur connecté, tel que l'interface l'affiche (aucun jeton). */
export type UtilisateurConnecte = {
	nom: string
	email: string
	estAdmin: boolean
}

/**
 * Lit la session de la requête en cours (cookie chiffré, éventuellement réparti sur plusieurs
 * cookies). Le proxy l'a déjà renouvelée si le jeton expirait : elle est lue telle quelle.
 *
 * @returns la session, ou null s'il n'y en a pas (absente, expirée ou illisible)
 */
export const lireSession = cache(async (): Promise<DonneesSession | null> => {
	// iron-session lit l'heure (expiration du cookie) : valeur propre à la requête, jamais prérendue
	await connection()
	const session = await getIronSession<DonneesSession>(await cookies(), optionsSession())
	return sessionOuverte(session) ? session : null
})

/**
 * Jeton d'accès à transmettre à l'API. Il n'est jamais renouvelé ici : le proxy l'a fait avant que
 * la requête n'arrive à la page. Sans session valide, redirige vers la page de connexion.
 *
 * @returns le jeton d'accès
 */
export const jetonAcces = cache(async (): Promise<string> => {
	const session = await lireSession()
	if (!session || session.expiresAt * 1000 <= Date.now()) {
		redirect(PAGE_CONNEXION)
	}
	return session.accessToken
})

/**
 * @returns l'utilisateur connecté ; sans session valide, redirige vers la page de connexion
 */
export const utilisateurCourant = cache(async (): Promise<UtilisateurConnecte> => {
	const session = await lireSession()
	if (!session) {
		redirect(PAGE_CONNEXION)
	}
	return { nom: session.nom, email: session.email, estAdmin: session.estAdmin }
})

/**
 * Réserve une page à l'administrateur : un autre utilisateur reçoit la page « introuvable », comme
 * pour une adresse inconnue. Ce n'est qu'un confort d'affichage : l'API refuse de toute façon les
 * appels non autorisés.
 */
export async function exigerAdmin(): Promise<void> {
	if (!(await utilisateurCourant()).estAdmin) {
		notFound()
	}
}

/**
 * Renouvelle le jeton d'accès auprès du fournisseur, même s'il n'a pas expiré, et l'enregistre
 * dans le cookie de session. Utile quand le compte a changé chez le fournisseur depuis la
 * connexion (email vérifié entre-temps) : le nouveau jeton porte ses revendications à jour.
 * Réservé aux Server Actions (le cookie n'est modifiable qu'à cet endroit).
 *
 * @returns le nouveau jeton d'accès, ou null sans session ou si le fournisseur refuse
 */
export async function jetonAccesRenouvele(): Promise<string | null> {
	const session = await getIronSession<DonneesSession>(await cookies(), optionsSession())
	if (!sessionOuverte(session)) {
		return null
	}
	const renouvelee = await rafraichirJeton(session)
	if (!renouvelee) {
		return null
	}
	Object.assign(session, renouvelee)
	await session.save()
	return renouvelee.accessToken
}
