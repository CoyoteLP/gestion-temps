// @vitest-environment node
// Code serveur : la cryptographie de Node (PKCE, chiffrement des cookies), pas celle de jsdom
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { magasinCookies, SECRET_DE_TEST } from "@/test/magasin-cookies"

import { type DonneesSession, optionsSession } from "./cookies"
import { rafraichirJeton } from "./jeton"
import { exigerAdmin, jetonAcces, jetonAccesRenouvele, utilisateurCourant } from "./session"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))
vi.mock("next/server", () => ({ connection: vi.fn() }))
vi.mock("next/navigation", () => ({
	redirect: vi.fn((url: string) => {
		throw new Error(`redirection:${url}`)
	}),
	notFound: vi.fn(() => {
		throw new Error("introuvable")
	}),
}))
vi.mock("./jeton", async (original) => ({
	...(await original<typeof import("./jeton")>()),
	rafraichirJeton: vi.fn(),
}))

const rafraichirSimule = vi.mocked(rafraichirJeton)
let magasin: ReturnType<typeof magasinCookies>

const session = (autres: Partial<DonneesSession> = {}): DonneesSession => ({
	accessToken: "jeton-1",
	refreshToken: "refresh-1",
	idToken: "identite",
	expiresAt: Math.floor(Date.now() / 1000) + 300,
	estAdmin: false,
	nom: "Jean Dupont",
	email: "jdupont@lirox.com",
	...autres,
})

async function ouvrir(donnees: DonneesSession) {
	const cookie = await getIronSession<DonneesSession>(magasin, optionsSession())
	Object.assign(cookie, donnees)
	await cookie.save()
}

beforeEach(() => {
	vi.stubEnv("SESSION_SECRET", SECRET_DE_TEST)
	magasin = magasinCookies()
	vi.mocked(cookies).mockResolvedValue(magasin as never)
	rafraichirSimule.mockReset()
	vi.mocked(redirect).mockClear()
})

describe("jetonAcces et utilisateurCourant", () => {
	it("lisent la session sans renouveler le jeton (le proxy l'a fait)", async () => {
		await ouvrir(session())

		await expect(jetonAcces()).resolves.toBe("jeton-1")
		await expect(utilisateurCourant()).resolves.toEqual({
			nom: "Jean Dupont",
			email: "jdupont@lirox.com",
			estAdmin: false,
		})
		expect(rafraichirSimule).not.toHaveBeenCalled()
	})

	it("renvoient vers la connexion sans session", async () => {
		await expect(jetonAcces()).rejects.toThrow("redirection:/connexion")
		await expect(utilisateurCourant()).rejects.toThrow("redirection:/connexion")
	})

	it("renvoie vers la connexion un jeton déjà expiré", async () => {
		await ouvrir(session({ expiresAt: Math.floor(Date.now() / 1000) - 10 }))

		await expect(jetonAcces()).rejects.toThrow("redirection:/connexion")
	})
})

describe("exigerAdmin", () => {
	it("laisse passer l'administrateur", async () => {
		await ouvrir(session({ estAdmin: true }))

		await expect(exigerAdmin()).resolves.toBeUndefined()
	})

	it("répond « introuvable » aux autres", async () => {
		await ouvrir(session())

		await expect(exigerAdmin()).rejects.toThrow("introuvable")
		expect(notFound).toHaveBeenCalled()
	})
})

describe("jetonAccesRenouvele", () => {
	it("renouvelle le jeton, l'enregistre dans le cookie et le renvoie", async () => {
		await ouvrir(session())
		rafraichirSimule.mockResolvedValue(session({ accessToken: "jeton-2" }))

		await expect(jetonAccesRenouvele()).resolves.toBe("jeton-2")
		const relue = await getIronSession<DonneesSession>(magasin, optionsSession())
		expect(relue.accessToken).toBe("jeton-2")
	})

	it("renvoie null sans session ou si le fournisseur refuse", async () => {
		await expect(jetonAccesRenouvele()).resolves.toBeNull()

		await ouvrir(session())
		rafraichirSimule.mockResolvedValue(null)
		await expect(jetonAccesRenouvele()).resolves.toBeNull()
	})
})
