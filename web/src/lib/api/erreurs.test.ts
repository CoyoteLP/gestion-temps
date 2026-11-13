import { describe, expect, it } from "vitest"

import { ApiError, valeurOuErreurApi } from "./erreurs"

describe("valeurOuErreurApi", () => {
	it("renvoie la valeur lue", async () => {
		await expect(valeurOuErreurApi(Promise.resolve({ id: 3 }))).resolves.toEqual({ id: 3 })
	})

	it("renvoie l'erreur de l'API pour l'afficher", async () => {
		const erreur = new ApiError(503, "Service indisponible", "id-503")

		await expect(valeurOuErreurApi(Promise.reject(erreur))).resolves.toBe(erreur)
	})

	it("laisse remonter une erreur qui ne vient pas de l'API", async () => {
		await expect(valeurOuErreurApi(Promise.reject(new Error("panne")))).rejects.toThrow("panne")
	})
})
