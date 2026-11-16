// @vitest-environment node
// Code serveur : la cryptographie de Node (PKCE, chiffrement des cookies), pas celle de jsdom
import { getIronSession } from "iron-session"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { magasinCookies, SECRET_DE_TEST } from "@/test/magasin-cookies"

import {
	cookiesSecurises,
	type DonneesSession,
	optionsConnexion,
	optionsSession,
	sessionOuverte,
} from "./cookies"

// Taille des jetons du Keycloak de dev (environ 3,3 Ko à eux trois)
const session: DonneesSession = {
	accessToken: "a".repeat(1500),
	refreshToken: "r".repeat(750),
	idToken: "i".repeat(1100),
	expiresAt: 1_800_000_000,
	estAdmin: false,
	nom: "Jean Dupont",
	email: "jdupont@lirox.com",
}

beforeEach(() => {
	vi.stubEnv("SESSION_SECRET", SECRET_DE_TEST)
	vi.stubEnv("APP_URL", "")
})

describe("cookie de session", () => {
	it("répartit des jetons trop gros pour un cookie sur plusieurs cookies, et les relit", async () => {
		const magasin = magasinCookies()
		const ecriture = await getIronSession<DonneesSession>(magasin, optionsSession())
		Object.assign(ecriture, session)
		await ecriture.save()

		const noms = [...magasin.valeurs.keys()]
		expect(noms.length).toBeGreaterThan(1)
		expect(noms.every((nom) => nom.startsWith("gestion-temps.session."))).toBe(true)
		// Limite d'un cookie dans les navigateurs : 4096 octets, nom compris
		expect([...magasin.valeurs].every(([nom, valeur]) => nom.length + valeur.length < 4096)).toBe(true)

		const lecture = await getIronSession<DonneesSession>(magasin, optionsSession())
		expect(sessionOuverte(lecture)).toBe(true)
		expect(lecture).toMatchObject(session)
	})

	it("ignore un cookie altéré : la session est vide", async () => {
		const magasin = magasinCookies()
		const ecriture = await getIronSession<DonneesSession>(magasin, optionsSession())
		Object.assign(ecriture, session)
		await ecriture.save()
		const [premier] = magasin.valeurs.keys()
		magasin.valeurs.set(premier, `x${magasin.valeurs.get(premier)?.slice(1)}`)
		vi.spyOn(console, "warn").mockImplementation(() => {})

		const lecture = await getIronSession<DonneesSession>(magasin, optionsSession())

		expect(sessionOuverte(lecture)).toBe(false)
	})

	it("ne relit pas une session chiffrée avec un autre secret", async () => {
		const magasin = magasinCookies()
		const ecriture = await getIronSession<DonneesSession>(magasin, optionsSession())
		Object.assign(ecriture, session)
		await ecriture.save()
		vi.stubEnv("SESSION_SECRET", `${SECRET_DE_TEST}-autre`)
		vi.spyOn(console, "warn").mockImplementation(() => {})

		expect(sessionOuverte(await getIronSession<DonneesSession>(magasin, optionsSession()))).toBe(false)
	})

	it("exige SESSION_SECRET", () => {
		vi.stubEnv("SESSION_SECRET", "")

		expect(() => optionsSession()).toThrow("SESSION_SECRET")
	})
})

describe("options des cookies", () => {
	it("pose des cookies httpOnly, SameSite=Lax, sans Secure en HTTP local", () => {
		expect(optionsSession()).toMatchObject({
			cookieName: "gestion-temps.session",
			chunk: true,
			cookieOptions: { httpOnly: true, secure: false, sameSite: "lax", path: "/" },
		})
		expect(optionsConnexion()).toMatchObject({ cookieName: "gestion-temps.connexion", ttl: 600 })
	})

	it("réserve les cookies au HTTPS, préfixés __Secure-, quand l'application est en https", () => {
		vi.stubEnv("APP_URL", "https://temps.exemple.fr")

		expect(cookiesSecurises()).toBe(true)
		expect(optionsSession()).toMatchObject({
			cookieName: "__Secure-gestion-temps.session",
			cookieOptions: { secure: true },
		})
	})

	it("reconnaît une session sans jeton comme fermée", () => {
		expect(sessionOuverte({})).toBe(false)
		expect(sessionOuverte({ accessToken: "a" })).toBe(false)
		expect(sessionOuverte(session)).toBe(true)
	})
})
