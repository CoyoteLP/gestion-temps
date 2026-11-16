// @vitest-environment node
// Code serveur : la cryptographie de Node (PKCE, chiffrement des cookies), pas celle de jsdom
import { getIronSession } from "iron-session"
import { cookies, headers } from "next/headers"
import * as client from "openid-client"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { magasinCookies, SECRET_DE_TEST } from "@/test/magasin-cookies"

import { seConnecter, seDeconnecter, sInscrire } from "./actions"
import { type DonneesConnexion, type DonneesSession, optionsConnexion, optionsSession } from "./cookies"
import { configurationOidc } from "./oidc"

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }))
vi.mock("next/navigation", () => ({
	redirect: vi.fn((url: string) => {
		throw new Error(`redirection:${url}`)
	}),
}))
vi.mock("./oidc", () => ({ configurationOidc: vi.fn() }))
vi.mock("openid-client", async (original) => ({
	...(await original<typeof import("openid-client")>()),
	buildAuthorizationUrl: vi.fn(
		(_config: unknown, parametres: Record<string, string>) =>
			new URL(`http://keycloak.test/auth?${new URLSearchParams(parametres)}`),
	),
	buildEndSessionUrl: vi.fn(
		(_config: unknown, parametres: Record<string, string>) =>
			new URL(`http://keycloak.test/logout?${new URLSearchParams(parametres)}`),
	),
}))

let magasin: ReturnType<typeof magasinCookies>

function formulaire(retour: string): FormData {
	const donnees = new FormData()
	donnees.set("retour", retour)
	return donnees
}

/** Exécute une action qui se termine par une redirection et renvoie l'URL de destination. */
async function destination(action: () => Promise<void>): Promise<URL> {
	const erreur = await action().catch((e: unknown) => e)
	return new URL(String((erreur as Error).message).replace("redirection:", ""), "http://app.test")
}

beforeEach(() => {
	vi.stubEnv("SESSION_SECRET", SECRET_DE_TEST)
	vi.stubEnv("APP_URL", "http://app.test")
	magasin = magasinCookies()
	vi.mocked(cookies).mockResolvedValue(magasin as never)
	vi.mocked(headers).mockResolvedValue(new Headers() as never)
	vi.mocked(configurationOidc).mockResolvedValue({} as client.Configuration)
})

describe("seConnecter", () => {
	it("redirige vers le fournisseur avec PKCE, state et nonce, gardés dans le cookie temporaire", async () => {
		const url = await destination(() => seConnecter(formulaire("/profil")))

		expect(url.origin).toBe("http://keycloak.test")
		expect(url.searchParams.get("redirect_uri")).toBe("http://app.test/api/auth/callback/keycloak")
		expect(url.searchParams.get("code_challenge_method")).toBe("S256")
		expect(url.searchParams.get("scope")).toBe("openid profile email")
		expect(url.searchParams.has("prompt")).toBe(false)
		const connexion = await getIronSession<DonneesConnexion>(magasin, optionsConnexion())
		expect(connexion.retour).toBe("/profil")
		expect(url.searchParams.get("state")).toBe(connexion.etat)
		expect(url.searchParams.get("nonce")).toBe(connexion.nonce)
		expect(url.searchParams.get("code_challenge")).toBe(
			await client.calculatePKCECodeChallenge(connexion.verificateur ?? ""),
		)
	})

	it("refuse un retour vers un autre site", async () => {
		await destination(() => seConnecter(formulaire("https://malveillant.example/piege")))

		const connexion = await getIronSession<DonneesConnexion>(magasin, optionsConnexion())
		expect(connexion.retour).toBe("/projets")
	})

	it("renvoie vers la page de connexion si le fournisseur est injoignable", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
		vi.mocked(configurationOidc).mockRejectedValue(new TypeError("fetch failed"))

		const url = await destination(() => seConnecter(formulaire("/profil")))

		expect(`${url.pathname}${url.search}`).toBe("/connexion?erreur=fournisseur")
	})
})

describe("sInscrire", () => {
	it("ouvre le formulaire d'inscription du fournisseur (prompt=create)", async () => {
		const url = await destination(() => sInscrire(formulaire("/profil")))

		expect(url.searchParams.get("prompt")).toBe("create")
	})
})

describe("seDeconnecter", () => {
	it("efface la session et ferme celle du fournisseur, avec retour sur la page de connexion", async () => {
		const session = await getIronSession<DonneesSession>(magasin, optionsSession())
		Object.assign(session, { accessToken: "a", expiresAt: 1, idToken: "identite" })
		await session.save()

		const url = await destination(seDeconnecter)

		expect(url.origin).toBe("http://keycloak.test")
		expect(url.searchParams.get("id_token_hint")).toBe("identite")
		expect(url.searchParams.get("post_logout_redirect_uri")).toBe("http://app.test/connexion")
		expect(magasin.valeurs.size).toBe(0)
	})

	it("ferme la session locale même si le fournisseur est injoignable", async () => {
		vi.mocked(configurationOidc).mockRejectedValue(new TypeError("fetch failed"))

		const url = await destination(seDeconnecter)

		expect(url.toString()).toBe("http://app.test/connexion")
	})
})
