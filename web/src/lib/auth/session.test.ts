import type { JWT } from "next-auth/jwt"
import { getToken } from "next-auth/jwt"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { unstable_update } from "@/auth"

import { rafraichirJeton } from "./jeton"
import { jetonAccesRenouvele } from "./session"

vi.mock("@/auth", () => ({ auth: vi.fn(), unstable_update: vi.fn() }))
vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock("./jeton", async (original) => ({
	...(await original<typeof import("./jeton")>()),
	rafraichirJeton: vi.fn(),
}))

const lireSimule = vi.mocked(getToken)
const rafraichirSimule = vi.mocked(rafraichirJeton)
const mettreAJourSimule = vi.mocked(unstable_update)

const session: JWT = {
	accessToken: "ancien",
	refreshToken: "renouvellement",
	idToken: "identite",
	expiresAt: 1_800_000_000,
	estAdmin: false,
}

beforeEach(() => {
	lireSimule.mockReset()
	rafraichirSimule.mockReset()
	mettreAJourSimule.mockReset()
	vi.stubEnv("AUTH_SECRET", "secret-de-test")
})

describe("jetonAccesRenouvele", () => {
	it("renouvelle le jeton, l'enregistre dans la session et le renvoie", async () => {
		lireSimule.mockResolvedValue(session as never)
		rafraichirSimule.mockResolvedValue({
			...session,
			accessToken: "nouveau",
			refreshToken: "renouvellement-2",
			expiresAt: 1_800_000_300,
		})

		await expect(jetonAccesRenouvele()).resolves.toBe("nouveau")
		expect(mettreAJourSimule).toHaveBeenCalledWith({
			jetonsRenouveles: {
				accessToken: "nouveau",
				expiresAt: 1_800_000_300,
				estAdmin: false,
				refreshToken: "renouvellement-2",
				idToken: "identite",
			},
		})
	})

	it("renvoie null sans session", async () => {
		lireSimule.mockResolvedValue(null)

		await expect(jetonAccesRenouvele()).resolves.toBeNull()
		expect(rafraichirSimule).not.toHaveBeenCalled()
	})

	it("renvoie null sans toucher la session si le fournisseur refuse le renouvellement", async () => {
		lireSimule.mockResolvedValue(session as never)
		rafraichirSimule.mockResolvedValue({ ...session, erreur: "RenouvellementImpossible" })

		await expect(jetonAccesRenouvele()).resolves.toBeNull()
		expect(mettreAJourSimule).not.toHaveBeenCalled()
	})
})
