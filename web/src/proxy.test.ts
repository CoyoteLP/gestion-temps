// @vitest-environment node
// Code serveur : la cryptographie de Node (PKCE, chiffrement des cookies), pas celle de jsdom
import { getIronSession, nextProxyCookies } from "iron-session"
import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { type DonneesSession, optionsSession } from "@/lib/auth/cookies"
import { rafraichirJeton } from "@/lib/auth/jeton"
import { SECRET_DE_TEST } from "@/test/magasin-cookies"

import { config, proxy } from "./proxy"

vi.mock("@/lib/auth/jeton", async (original) => ({
	...(await original<typeof import("@/lib/auth/jeton")>()),
	rafraichirJeton: vi.fn(),
}))

const rafraichirSimule = vi.mocked(rafraichirJeton)
const maintenant = () => Math.floor(Date.now() / 1000)

const session = (autres: Partial<DonneesSession> = {}): DonneesSession => ({
	accessToken: "jeton-1",
	refreshToken: "refresh-1",
	expiresAt: maintenant() + 300,
	estAdmin: false,
	nom: "Jean Dupont",
	email: "jdupont@lirox.com",
	...autres,
})

/** Requête vers l'application portant les cookies d'une session ouverte (s'il y en a une). */
async function requete(chemin: string, donnees?: DonneesSession): Promise<NextRequest> {
	const url = `http://app.test${chemin}`
	if (!donnees) {
		return new NextRequest(url)
	}
	const reponse = NextResponse.next()
	const cookie = await getIronSession<DonneesSession>(
		nextProxyCookies(new NextRequest(url), reponse),
		optionsSession(),
	)
	Object.assign(cookie, donnees)
	await cookie.save()
	const entete = reponse.cookies
		.getAll()
		.map(({ name, value }) => `${name}=${value}`)
		.join("; ")
	return new NextRequest(url, { headers: { cookie: entete } })
}

beforeEach(() => {
	vi.stubEnv("SESSION_SECRET", SECRET_DE_TEST)
	vi.stubEnv("APP_URL", "")
	rafraichirSimule.mockReset()
})

describe("proxy", () => {
	it("renvoie vers la connexion sans session, avec la page demandée en retour", async () => {
		const reponse = await proxy(await requete("/projets?page=2"))

		expect(reponse.headers.get("location")).toBe("http://app.test/connexion?retour=%2Fprojets%3Fpage%3D2")
	})

	it("laisse passer une session valide sans renouveler le jeton", async () => {
		const reponse = await proxy(await requete("/projets", session()))

		expect(reponse.headers.get("location")).toBeNull()
		expect(rafraichirSimule).not.toHaveBeenCalled()
		expect(reponse.cookies.getAll()).toEqual([])
	})

	it("renouvelle une fois un jeton qui expire et transmet le nouveau à la page", async () => {
		rafraichirSimule.mockResolvedValue(session({ accessToken: "jeton-2" }))

		const reponse = await proxy(await requete("/projets", session({ expiresAt: maintenant() + 10 })))

		expect(rafraichirSimule).toHaveBeenCalledTimes(1)
		expect(reponse.headers.get("location")).toBeNull()
		// Les cookies de la réponse sont ceux que la page lit dans la même requête
		const relue = await getIronSession<DonneesSession>(
			nextProxyCookies(await requeteAvec(reponse), NextResponse.next()),
			optionsSession(),
		)
		expect(relue.accessToken).toBe("jeton-2")
	})

	it("efface la session et renvoie vers la connexion si le renouvellement échoue", async () => {
		rafraichirSimule.mockResolvedValue(null)

		const reponse = await proxy(await requete("/projets", session({ expiresAt: maintenant() - 10 })))

		expect(reponse.headers.get("location")).toBe("http://app.test/connexion?retour=%2Fprojets")
		expect(reponse.cookies.getAll().every((cookie) => cookie.value === "")).toBe(true)
		expect(reponse.cookies.getAll().length).toBeGreaterThan(0)
	})
})

describe("en-têtes de sécurité du proxy", () => {
	const nonceDe = (reponse: NextResponse) =>
		/'nonce-([^']+)'/.exec(reponse.headers.get("content-security-policy") ?? "")?.[1]

	it("pose une CSP avec un nonce propre à chaque requête, transmise au rendu avec le nonce", async () => {
		const premiere = await proxy(await requete("/projets", session()))
		const seconde = await proxy(await requete("/projets", session()))

		const nonce = nonceDe(premiere)
		expect(nonce).toBeTruthy()
		expect(nonceDe(seconde)).not.toBe(nonce)
		// En-têtes de la requête transmise au rendu (Next.js y lit le nonce)
		expect(premiere.headers.get("x-middleware-request-x-nonce")).toBe(nonce)
		expect(premiere.headers.get("x-middleware-request-content-security-policy")).toContain(
			`'nonce-${nonce}'`,
		)
	})

	it("garde les cookies renouvelés sur la réponse transmise au rendu", async () => {
		rafraichirSimule.mockResolvedValue(session({ accessToken: "jeton-2" }))

		const reponse = await proxy(await requete("/projets", session({ expiresAt: maintenant() + 10 })))

		expect(nonceDe(reponse)).toBeTruthy()
		expect(reponse.cookies.getAll().some(({ value }) => value)).toBe(true)
	})

	it.each(["/connexion", "/connexion?erreur=expiree", "/api/auth/callback/keycloak?code=x"])(
		"sert %s sans session, avec la CSP",
		async (chemin) => {
			const reponse = await proxy(await requete(chemin))

			expect(reponse.headers.get("location")).toBeNull()
			expect(nonceDe(reponse)).toBeTruthy()
		},
	)

	it("pose aussi la CSP sur la redirection vers la connexion", async () => {
		const reponse = await proxy(await requete("/connexions-actives"))

		expect(reponse.headers.get("location")).toContain("/connexion?retour=")
		expect(nonceDe(reponse)).toBeTruthy()
	})

	it("impose le HTTPS (HSTS) quand l'application est en https, jamais en HTTP local", async () => {
		expect((await proxy(await requete("/connexion"))).headers.get("strict-transport-security")).toBeNull()

		vi.stubEnv("APP_URL", "https://temps.exemple.fr")
		expect((await proxy(await requete("/connexion"))).headers.get("strict-transport-security")).toBe(
			"max-age=31536000",
		)
	})
})

/** Requête portant les cookies posés par une réponse du proxy. */
async function requeteAvec(reponse: NextResponse): Promise<NextRequest> {
	const entete = reponse.cookies
		.getAll()
		.filter(({ value }) => value)
		.map(({ name, value }) => `${name}=${value}`)
		.join("; ")
	return new NextRequest("http://app.test/projets", { headers: { cookie: entete } })
}

/** Équivalent du motif tel que Next.js l'applique au chemin de la requête. */
const motif = new RegExp(`^${config.matcher[0]}$`)

describe("config.matcher du proxy", () => {
	it.each([
		"/",
		"/projets",
		"/profil",
		"/connexion",
		"/connexions-actives",
		"/api/auth/callback/keycloak",
		"/api/projets",
		"/_next/staticx",
		"/favicon.ico.html",
	])("s'applique à %s (CSP, et session hors connexion)", (chemin) => {
		expect(motif.test(chemin)).toBe(true)
	})

	it.each(["/_next/static/chunks/app.js", "/_next/image", "/favicon.ico"])(
		"ne s'applique pas au fichier statique %s",
		(chemin) => {
			expect(motif.test(chemin)).toBe(false)
		},
	)
})
