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
		"/projets?page=2",
		"/profil",
		"/connexions-actives",
		"/connexion-admin",
		"/api/authentification",
		"/api/projets",
		"/favicon.ico.html",
	])("protège %s", (chemin) => {
		expect(motif.test(chemin.split("?")[0])).toBe(true)
	})

	it.each([
		"/connexion",
		"/connexion/",
		"/api/auth",
		"/api/auth/callback/keycloak",
		"/_next/static/chunks/app.js",
		"/_next/image",
		"/favicon.ico",
	])("laisse passer sans session %s", (chemin) => {
		expect(motif.test(chemin)).toBe(false)
	})
})
