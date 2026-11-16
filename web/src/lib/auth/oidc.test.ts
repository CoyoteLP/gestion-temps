// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { fournisseurJoignable } from "./oidc"

const fetchSimule = vi.fn<typeof fetch>()

beforeEach(() => {
	vi.stubEnv("OIDC_ISSUER_URI", "http://keycloak.test/realms/gestion-temps/")
	vi.stubGlobal("fetch", fetchSimule)
	fetchSimule.mockReset()
})

describe("fournisseurJoignable", () => {
	it("interroge le document de découverte du fournisseur", async () => {
		fetchSimule.mockResolvedValue(Response.json({ issuer: "x" }))

		await expect(fournisseurJoignable(2000)).resolves.toBe(true)
		expect(fetchSimule.mock.calls[0][0]).toBe(
			"http://keycloak.test/realms/gestion-temps/.well-known/openid-configuration",
		)
	})

	it("le considère indisponible s'il répond une erreur, ne répond pas ou n'est pas configuré", async () => {
		fetchSimule.mockResolvedValueOnce(new Response(null, { status: 404 }))
		await expect(fournisseurJoignable(2000)).resolves.toBe(false)

		fetchSimule.mockRejectedValueOnce(new DOMException("délai dépassé", "TimeoutError"))
		await expect(fournisseurJoignable(2000)).resolves.toBe(false)

		vi.stubEnv("OIDC_ISSUER_URI", "")
		await expect(fournisseurJoignable(2000)).resolves.toBe(false)
	})
})
