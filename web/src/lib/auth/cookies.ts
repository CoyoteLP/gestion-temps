import "server-only"

import type { SessionOptions } from "iron-session"

import {
	DUREE_CONNEXION_SECONDES,
	DUREE_SESSION_SECONDES,
	NOM_COOKIE_CONNEXION,
	NOM_COOKIE_SESSION,
} from "@/lib/constantes"

/**
 * Contenu du cookie de session chiffré : lisible par le serveur Next.js seulement, jamais exposé au
 * navigateur ni aux composants clients.
 */
export type DonneesSession = {
	accessToken: string
	refreshToken?: string
	/** Jeton d'identité, pour la déconnexion chez le fournisseur (`id_token_hint`). */
	idToken?: string
	/** Expiration du jeton d'accès, en secondes depuis l'époque Unix. */
	expiresAt: number
	estAdmin: boolean
	nom: string
	email: string
}

/** Contenu du cookie temporaire d'une connexion en cours chez le fournisseur. */
export type DonneesConnexion = {
	/** Vérificateur PKCE, dont le hachage a été envoyé au fournisseur. */
	verificateur: string
	etat: string
	nonce: string
	/** Page de l'application où revenir après la connexion. */
	retour: string
}

/**
 * Cookies `Secure` (et préfixés `__Secure-`) quand l'application est servie en HTTPS : d'après
 * `APP_URL` si elle est définie, sinon en production.
 *
 * @returns vrai pour des cookies réservés au HTTPS
 */
export function cookiesSecurises(): boolean {
	const url = process.env.APP_URL
	return url ? url.startsWith("https:") : process.env.NODE_ENV === "production"
}

function secret(): string {
	const valeur = process.env.SESSION_SECRET
	if (!valeur) {
		throw new Error("SESSION_SECRET n'est pas défini")
	}
	return valeur
}

function options(nom: string, duree: number, chunk: boolean): SessionOptions {
	const securise = cookiesSecurises()
	return {
		cookieName: securise ? `__Secure-${nom}` : nom,
		password: secret(),
		ttl: duree,
		chunk,
		cookieOptions: { httpOnly: true, secure: securise, sameSite: "lax", path: "/" },
		onUnsealError: (raison) => {
			// Une session expirée est normale ; un cookie illisible peut signaler une altération
			if (raison !== "expired") {
				console.warn(`Cookie ${nom} illisible (${raison}) : session ignorée`)
			}
		},
	}
}

/**
 * Options du cookie de session : chiffré par `SESSION_SECRET`, `httpOnly`, `SameSite=Lax`, réparti
 * sur plusieurs cookies si les jetons dépassent la taille d'un cookie.
 *
 * @returns les options d'`iron-session`
 * @throws Error si `SESSION_SECRET` n'est pas défini
 */
export function optionsSession(): SessionOptions {
	return options(NOM_COOKIE_SESSION, DUREE_SESSION_SECONDES, true)
}

/**
 * Options du cookie temporaire d'une connexion en cours (10 minutes).
 *
 * @returns les options d'`iron-session`
 * @throws Error si `SESSION_SECRET` n'est pas défini
 */
export function optionsConnexion(): SessionOptions {
	return options(NOM_COOKIE_CONNEXION, DUREE_CONNEXION_SECONDES, false)
}

/**
 * @param session contenu d'un cookie de session (vide s'il est absent, expiré ou illisible)
 * @returns vrai si la session porte un jeton d'accès
 */
export function sessionOuverte(session: Partial<DonneesSession>): session is DonneesSession {
	return typeof session.accessToken === "string" && typeof session.expiresAt === "number"
}
