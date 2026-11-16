// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

import { GET } from "./route"

vi.mock("next/server", async (original) => ({
	...(await original<typeof import("next/server")>()),
	connection: vi.fn(),
}))

describe("sonde de vivacité", () => {
	it("répond UP, sans mise en cache", async () => {
		const reponse = await GET()

		expect(reponse.status).toBe(200)
		await expect(reponse.json()).resolves.toEqual({ statut: "UP" })
		expect(reponse.headers.get("cache-control")).toBe("no-store")
	})
})
