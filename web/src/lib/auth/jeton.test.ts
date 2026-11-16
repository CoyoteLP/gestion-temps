// @vitest-environment node
// Code serveur : la cryptographie de Node (PKCE, chiffrement des cookies), pas celle de jsdom
import * as client from "openid-client"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DonneesSession } from "./cookies"
import {
	estAdministrateur,
	expirationProche,
	rafraichirJeton,
	rolesDuJeton,
	sessionDepuisJetons,
} from "./jeton"
import { configurationOidc } from "./oidc"

vi.mock("./oidc", () => ({ configurationOidc: vi.fn() }))
vi.mock("openid-client", async (original) => ({
	...(await original<typeof import("openid-client")>()),
	refreshTokenGrant: vi.fn(),
}))

/** Jeton JWT non signé portant la charge donnée (seule la charge est lue). */
function jwt(charge: object): string {
	return `entete.${Buffer.from(JSON.stringify(charge)).toString("base64url")}.signature`
}

describe("rolesDuJeton", () => {
	it("lit une revendication à plat", () => {
		expect(rolesDuJeton(jwt({ roles: ["ADMIN", "AUTRE"] }), "roles")).toEqual(["ADMIN", "AUTRE"])
	})

	it("lit une revendication imbriquée (chemin pointé)", () => {
		expect(rolesDuJeton(jwt({ realm_access: { roles: ["ADMIN"] } }), "realm_access.roles")).toEqual([
			"ADMIN",
		])
	})

	it("ignore les valeurs qui ne sont pas des chaînes", () => {
		expect(rolesDuJeton(jwt({ roles: ["ADMIN", 3, null] }), "roles")).toEqual(["ADMIN"])
	})

	it.each([
		["revendication absente", jwt({ sub: "1" })],
		["revendication qui n'est pas une liste", jwt({ roles: "ADMIN" })],
		["jeton sans charge", "illisible"],
		["charge qui n'est pas du JSON", "entete.pas-du-json.signature"],
	])("renvoie une liste vide : %s", (_cas, jeton) => {
		expect(rolesDuJeton(jeton, "roles")).toEqual([])
	})
})

describe("estAdministrateur", () => {
	it("reconnaît le rôle administrateur dans la revendication par défaut", () => {
		expect(estAdministrateur(jwt({ roles: ["ADMIN"] }))).toBe(true)
		expect(estAdministrateur(jwt({ roles: ["COLLABORATEUR"] }))).toBe(false)
	})

	it("lit la revendication configurée par OIDC_ROLES_CLAIM", () => {
		vi.stubEnv("OIDC_ROLES_CLAIM", "realm_access.roles")
		expect(estAdministrateur(jwt({ realm_access: { roles: ["ADMIN"] } }))).toBe(true)
		expect(estAdministrateur(jwt({ roles: ["ADMIN"] }))).toBe(false)
	})
})

describe("expirationProche", () => {
	const maintenant = Date.UTC(2026, 10, 11, 10, 0, 0)
	const dans = (secondes: number) => ({ expiresAt: maintenant / 1000 + secondes })

	it("garde un jeton valide au-delà de la marge", () => {
		expect(expirationProche(dans(61), maintenant)).toBe(false)
	})

	it.each([60, 1, -10])("renouvelle un jeton qui expire dans %s s", (secondes) => {
		expect(expirationProche(dans(secondes), maintenant)).toBe(true)
	})

	it("renouvelle un jeton sans date d'expiration", () => {
		expect(expirationProche({}, maintenant)).toBe(true)
	})
})

/** Réponse du point de terminaison `token`, telle qu'`openid-client` la renvoie après vérification. */
function reponseJetons(
	jetons: Partial<client.TokenEndpointResponse>,
	identite?: Record<string, unknown>,
): client.TokenEndpointResponse & client.TokenEndpointResponseHelpers {
	return {
		access_token: jwt({ roles: [] }),
		token_type: "bearer",
		expires_in: 300,
		...jetons,
		claims: () => identite as client.IDToken | undefined,
		expiresIn: () => jetons.expires_in ?? 300,
	} as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
}

const maintenant = Date.UTC(2026, 10, 16, 10, 0, 0)

describe("sessionDepuisJetons", () => {
	it("enregistre les jetons, leur expiration, le rôle et l'identité du jeton d'identité", () => {
		const acces = jwt({ roles: ["ADMIN"] })

		expect(
			sessionDepuisJetons(
				reponseJetons(
					{ access_token: acces, refresh_token: "r", id_token: "i", expires_in: 300 },
					{ name: "Léa Martin", email: "lea@exemple.fr" },
				),
				undefined,
				maintenant,
			),
		).toEqual({
			accessToken: acces,
			refreshToken: "r",
			idToken: "i",
			expiresAt: maintenant / 1000 + 300,
			estAdmin: true,
			nom: "Léa Martin",
			email: "lea@exemple.fr",
		})
	})

	it("garde au renouvellement ce que le fournisseur ne renvoie pas", () => {
		const precedente: DonneesSession = {
			accessToken: "ancien",
			refreshToken: "r-1",
			idToken: "i-1",
			expiresAt: 0,
			estAdmin: false,
			nom: "Léa Martin",
			email: "lea@exemple.fr",
		}

		expect(sessionDepuisJetons(reponseJetons({}), precedente, maintenant)).toMatchObject({
			refreshToken: "r-1",
			idToken: "i-1",
			nom: "Léa Martin",
			email: "lea@exemple.fr",
		})
	})

	it("prend l'identifiant de connexion, puis l'email, à défaut de nom", () => {
		expect(
			sessionDepuisJetons(reponseJetons({}, { preferred_username: "lmartin", email: "l@e.fr" })).nom,
		).toBe("lmartin")
		expect(sessionDepuisJetons(reponseJetons({}, { email: "l@e.fr" })).nom).toBe("l@e.fr")
	})
})

describe("rafraichirJeton", () => {
	const session: DonneesSession = {
		accessToken: "ancien",
		refreshToken: "refresh-1",
		idToken: "id-1",
		expiresAt: 0,
		estAdmin: false,
		nom: "Léa Martin",
		email: "lea@exemple.fr",
	}
	const renouveler = vi.mocked(client.refreshTokenGrant)

	beforeEach(() => {
		renouveler.mockReset()
		vi.mocked(configurationOidc).mockResolvedValue({} as client.Configuration)
	})

	it("renouvelle les jetons avec le refresh token", async () => {
		const acces = jwt({ roles: ["ADMIN"] })
		renouveler.mockResolvedValue(reponseJetons({ access_token: acces, refresh_token: "refresh-2" }))

		const renouvelee = await rafraichirJeton(session)

		expect(renouveler).toHaveBeenCalledWith({}, "refresh-1")
		expect(renouvelee).toMatchObject({
			accessToken: acces,
			refreshToken: "refresh-2",
			idToken: "id-1",
			estAdmin: true,
		})
	})

	it("renvoie null si le fournisseur refuse ou est injoignable, sans journaliser de jeton", async () => {
		const avertir = vi.spyOn(console, "warn").mockImplementation(() => {})
		renouveler.mockRejectedValue(new TypeError("refus"))

		await expect(rafraichirJeton(session)).resolves.toBeNull()
		expect(JSON.stringify(avertir.mock.calls)).not.toContain("refresh-1")
	})

	it("renvoie null sans refresh token, sans appeler le fournisseur", async () => {
		await expect(rafraichirJeton({ ...session, refreshToken: undefined })).resolves.toBeNull()
		expect(renouveler).not.toHaveBeenCalled()
	})
})
