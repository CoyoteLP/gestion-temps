import type { JWT } from "next-auth/jwt"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	estAdministrateur,
	expirationProche,
	jetonsRenouvelesDe,
	rafraichirJeton,
	rolesDuJeton,
} from "./jeton"
import { oublierConfigurationOidc } from "./oidc"

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

	it("lit la revendication configurée par AUTH_ROLES_CLAIM", () => {
		vi.stubEnv("AUTH_ROLES_CLAIM", "realm_access.roles")
		expect(estAdministrateur(jwt({ realm_access: { roles: ["ADMIN"] } }))).toBe(true)
		expect(estAdministrateur(jwt({ roles: ["ADMIN"] }))).toBe(false)
	})
})

describe("expirationProche", () => {
	const maintenant = Date.UTC(2026, 10, 11, 10, 0, 0)
	const dans = (secondes: number): JWT => ({ expiresAt: maintenant / 1000 + secondes })

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

describe("rafraichirJeton", () => {
	const jetonInitial: JWT = {
		accessToken: "ancien",
		refreshToken: "refresh-1",
		idToken: "id-1",
		expiresAt: 0,
		estAdmin: false,
	}
	const fetchSimule = vi.fn<typeof fetch>()

	beforeEach(() => {
		oublierConfigurationOidc()
		vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "https://idp.test/realms/gt")
		vi.stubEnv("AUTH_KEYCLOAK_ID", "gestion-temps-web")
		vi.stubEnv("AUTH_KEYCLOAK_SECRET", "")
		vi.stubGlobal("fetch", fetchSimule)
		vi.spyOn(console, "warn").mockImplementation(() => {})
		fetchSimule.mockReset()
	})

	afterEach(() => {
		oublierConfigurationOidc()
	})

	function decouverteEtJeton(reponseJeton: Response) {
		fetchSimule
			.mockResolvedValueOnce(Response.json({ token_endpoint: "https://idp.test/token" }))
			.mockResolvedValueOnce(reponseJeton)
	}

	it("remplace les jetons et recalcule l'expiration et le rôle", async () => {
		const accesAdmin = jwt({ roles: ["ADMIN"] })
		decouverteEtJeton(
			Response.json({ access_token: accesAdmin, expires_in: 300, refresh_token: "refresh-2" }),
		)
		const avant = Math.floor(Date.now() / 1000)

		const jeton = await rafraichirJeton(jetonInitial)

		expect(jeton).toMatchObject({
			accessToken: accesAdmin,
			refreshToken: "refresh-2",
			idToken: "id-1",
			estAdmin: true,
		})
		expect(jeton.erreur).toBeUndefined()
		expect(jeton.expiresAt).toBeGreaterThanOrEqual(avant + 300)
		const [url, requete] = fetchSimule.mock.calls[1]
		expect(url).toBe("https://idp.test/token")
		const corps = requete?.body as URLSearchParams
		expect(corps.get("grant_type")).toBe("refresh_token")
		expect(corps.get("refresh_token")).toBe("refresh-1")
		expect(corps.get("client_id")).toBe("gestion-temps-web")
		expect(corps.has("client_secret")).toBe(false)
	})

	it("garde le refresh token si le fournisseur n'en renvoie pas de nouveau", async () => {
		decouverteEtJeton(Response.json({ access_token: jwt({}), expires_in: 300 }))
		expect((await rafraichirJeton(jetonInitial)).refreshToken).toBe("refresh-1")
	})

	it("marque la session en erreur si le fournisseur refuse le renouvellement", async () => {
		decouverteEtJeton(Response.json({ error: "invalid_grant" }, { status: 400 }))
		expect((await rafraichirJeton(jetonInitial)).erreur).toBe("RenouvellementImpossible")
	})

	it("marque la session en erreur si le fournisseur est injoignable", async () => {
		fetchSimule.mockRejectedValue(new TypeError("fetch failed"))
		expect((await rafraichirJeton(jetonInitial)).erreur).toBe("RenouvellementImpossible")
	})

	it("marque la session en erreur sans refresh token, sans appeler le fournisseur", async () => {
		expect((await rafraichirJeton({ ...jetonInitial, refreshToken: undefined })).erreur).toBe(
			"RenouvellementImpossible",
		)
		expect(fetchSimule).not.toHaveBeenCalled()
	})
})

describe("jetonsRenouvelesDe", () => {
	const jetons = {
		accessToken: "acces",
		expiresAt: 1_800_000_000,
		estAdmin: false,
		refreshToken: "renouvellement",
		idToken: "identite",
	}

	it("lit les jetons renouvelés d'une mise à jour de session", () => {
		expect(jetonsRenouvelesDe({ jetonsRenouveles: jetons })).toEqual(jetons)
	})

	it("ignore les champs étrangers et les jetons facultatifs mal typés", () => {
		expect(
			jetonsRenouvelesDe({
				jetonsRenouveles: { ...jetons, refreshToken: 3, idToken: undefined, erreur: "x" },
			}),
		).toEqual({ accessToken: "acces", expiresAt: 1_800_000_000, estAdmin: false })
	})

	it.each([
		["données absentes", undefined],
		["autre mise à jour de session", { user: { name: "Jean" } }],
		["jeton d'accès manquant", { jetonsRenouveles: { ...jetons, accessToken: undefined } }],
		["expiration qui n'est pas un nombre", { jetonsRenouveles: { ...jetons, expiresAt: "demain" } }],
		["rôle administrateur absent", { jetonsRenouveles: { ...jetons, estAdmin: undefined } }],
	])("refuse : %s", (_cas, donnees) => {
		expect(jetonsRenouvelesDe(donnees)).toBeNull()
	})
})
