// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiJoignable } from "@/lib/api/client"
import { fournisseurJoignable } from "@/lib/auth/oidc"

import { GET } from "./route"

vi.mock("next/server", async (original) => ({
	...(await original<typeof import("next/server")>()),
	connection: vi.fn(),
}))
vi.mock("@/lib/api/client", () => ({ apiJoignable: vi.fn() }))
vi.mock("@/lib/auth/oidc", () => ({ fournisseurJoignable: vi.fn() }))

beforeEach(() => {
	vi.mocked(apiJoignable).mockResolvedValue(true)
	vi.mocked(fournisseurJoignable).mockResolvedValue(true)
})

describe("sonde de disponibilité", () => {
	it("répond UP quand l'API et le fournisseur OIDC répondent, avec un délai de 2 s", async () => {
		const reponse = await GET()

		expect(reponse.status).toBe(200)
		await expect(reponse.json()).resolves.toEqual({ statut: "UP" })
		expect(apiJoignable).toHaveBeenCalledWith(2000)
		expect(fournisseurJoignable).toHaveBeenCalledWith(2000)
	})

	it.each([
		["l'API", apiJoignable],
		["le fournisseur OIDC", fournisseurJoignable],
	])("répond 503 sans détail quand %s est injoignable, et journalise la cause", async (_cas, controle) => {
		const avertir = vi.spyOn(console, "warn").mockImplementation(() => {})
		vi.mocked(controle).mockResolvedValue(false)

		const reponse = await GET()

		expect(reponse.status).toBe(503)
		await expect(reponse.json()).resolves.toEqual({ statut: "DOWN" })
		expect(avertir).toHaveBeenCalledWith(expect.stringContaining("injoignable"))
	})
})
