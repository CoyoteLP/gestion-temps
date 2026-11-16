// @vitest-environment node
// Code serveur : la cryptographie de Node (PKCE, chiffrement des cookies), pas celle de jsdom
import { getIronSession } from "iron-session"
import { cookies, headers } from "next/headers"
import { NextRequest } from "next/server"
import * as client from "openid-client"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	type DonneesConnexion,
	type DonneesSession,
	optionsConnexion,
	optionsSession,
} from "@/lib/auth/cookies"
import { configurationOidc } from "@/lib/auth/oidc"
import { enregistrerALaConnexion } from "@/lib/compte/enregistrement"
import { magasinCookies, SECRET_DE_TEST } from "@/test/magasin-cookies"

import { GET } from "./route"

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }))
vi.mock("next/server", async (original) => ({
	...(await original<typeof import("next/server")>()),
	connection: vi.fn(),
}))
vi.mock("@/lib/auth/oidc", () => ({ configurationOidc: vi.fn() }))
vi.mock("@/lib/compte/enregistrement", () => ({ enregistrerALaConnexion: vi.fn() }))
vi.mock("openid-client", async (original) => ({
	...(await original<typeof import("openid-client")>()),
	authorizationCodeGrant: vi.fn(),
}))

const echanger = vi.mocked(client.authorizationCodeGrant)
let magasin: ReturnType<typeof magasinCookies>

/** Jeton JWT non signé portant la charge donnée (seule la charge est lue). */
const jwt = (charge: object) => `e.${Buffer.from(JSON.stringify(charge)).toString("base64url")}.s`

const reponseJetons = {
	access_token: jwt({ roles: [] }),
	refresh_token: "refresh",
	id_token: "identite",
	token_type: "bearer",
	expires_in: 300,
	claims: () => ({ name: "Jean Dupont", email: "jdupont@lirox.com" }),
} as unknown as Awaited<ReturnType<typeof client.authorizationCodeGrant>>

async function connexionEnCours(donnees: DonneesConnexion) {
	const cookie = await getIronSession<DonneesConnexion>(magasin, optionsConnexion())
	Object.assign(cookie, donnees)
	await cookie.save()
}

const rappel = () =>
	GET(new NextRequest("http://interne:3000/api/auth/callback/keycloak?code=abc&state=etat-1"))

beforeEach(() => {
	vi.stubEnv("SESSION_SECRET", SECRET_DE_TEST)
	vi.stubEnv("APP_URL", "http://app.test")
	magasin = magasinCookies()
	vi.mocked(cookies).mockResolvedValue(magasin as never)
	vi.mocked(headers).mockResolvedValue(new Headers() as never)
	vi.mocked(configurationOidc).mockResolvedValue({} as client.Configuration)
	vi.mocked(enregistrerALaConnexion).mockReset()
	echanger.mockReset()
})

describe("retour du fournisseur", () => {
	it("échange le code avec les contrôles PKCE, state et nonce, ouvre la session et revient sur la page", async () => {
		await connexionEnCours({ verificateur: "v", etat: "etat-1", nonce: "n", retour: "/profil" })
		echanger.mockResolvedValue(reponseJetons)

		const reponse = await rappel()

		expect(reponse.headers.get("location")).toBe("http://app.test/profil")
		const [, url, controles] = echanger.mock.calls[0]
		expect(String(url)).toBe("http://app.test/api/auth/callback/keycloak?code=abc&state=etat-1")
		expect(controles).toEqual({
			pkceCodeVerifier: "v",
			expectedState: "etat-1",
			expectedNonce: "n",
			idTokenExpected: true,
		})
		const session = await getIronSession<DonneesSession>(magasin, optionsSession())
		expect(session).toMatchObject({ nom: "Jean Dupont", refreshToken: "refresh", idToken: "identite" })
		expect(enregistrerALaConnexion).toHaveBeenCalledWith(reponseJetons.access_token)
		// Le cookie temporaire est à usage unique
		expect(magasin.valeurs.has("gestion-temps.connexion")).toBe(false)
	})

	it("refuse un retour sans connexion en cours (cookie absent ou expiré)", async () => {
		const reponse = await rappel()

		expect(reponse.headers.get("location")).toBe("http://app.test/connexion?erreur=expiree")
		expect(echanger).not.toHaveBeenCalled()
	})

	it("signale un accès refusé par l'utilisateur ou le fournisseur", async () => {
		await connexionEnCours({ verificateur: "v", etat: "etat-1", nonce: "n", retour: "/profil" })
		const refus = Object.assign(Object.create(client.AuthorizationResponseError.prototype) as object, {
			error: "access_denied",
		})
		echanger.mockRejectedValue(refus)

		const reponse = await rappel()

		expect(reponse.headers.get("location")).toBe("http://app.test/connexion?erreur=refus")
	})

	it("traite un state qui ne correspond pas comme une connexion à recommencer", async () => {
		await connexionEnCours({ verificateur: "v", etat: "etat-1", nonce: "n", retour: "/profil" })
		echanger.mockRejectedValue(
			Object.assign(new Error('unexpected "state" response parameter value'), {
				code: "OAUTH_INVALID_RESPONSE",
			}),
		)

		const reponse = await rappel()

		expect(reponse.headers.get("location")).toBe("http://app.test/connexion?erreur=expiree")
		expect([...magasin.valeurs.keys()].some((nom) => nom.startsWith("gestion-temps.session"))).toBe(false)
	})

	it("refuse un jeton invalide, sans ouvrir de session", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
		await connexionEnCours({ verificateur: "v", etat: "etat-1", nonce: "n", retour: "/profil" })
		echanger.mockRejectedValue(
			Object.assign(new Error('unexpected ID Token "nonce" claim value'), {
				code: "OAUTH_JWT_CLAIM_COMPARISON_FAILED",
			}),
		)

		const reponse = await rappel()

		expect(reponse.headers.get("location")).toBe("http://app.test/connexion?erreur=fournisseur")
		expect([...magasin.valeurs.keys()].some((nom) => nom.startsWith("gestion-temps.session"))).toBe(false)
		expect(enregistrerALaConnexion).not.toHaveBeenCalled()
	})
})
