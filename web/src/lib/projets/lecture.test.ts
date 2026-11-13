import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { lireProjet } from "@/lib/api/projets"

import { lireProjetDeLaPage } from "./lecture"

vi.mock("@/lib/api/projets", () => ({ lireProjet: vi.fn() }))

const lireSimule = vi.mocked(lireProjet)
const INTROUVABLE = "NEXT_HTTP_ERROR_FALLBACK;404"

beforeEach(() => {
	lireSimule.mockReset()
})

describe("lireProjetDeLaPage", () => {
	it("lit le projet désigné par l'URL", async () => {
		lireSimule.mockResolvedValue({ id: 3 } as never)

		await expect(lireProjetDeLaPage("3")).resolves.toEqual({ id: 3 })
		expect(lireSimule).toHaveBeenCalledWith(3)
	})

	it("affiche « introuvable » pour un identifiant invalide, sans appeler l'API", async () => {
		await expect(lireProjetDeLaPage("abc")).rejects.toThrow(INTROUVABLE)
		expect(lireSimule).not.toHaveBeenCalled()
	})

	it("affiche « introuvable » pour un projet inconnu", async () => {
		lireSimule.mockRejectedValue(new ApiError(404, "Projet introuvable", "id"))

		await expect(lireProjetDeLaPage("3")).rejects.toThrow(INTROUVABLE)
	})

	it("renvoie les autres erreurs de l'API pour les afficher", async () => {
		const erreur = new ApiError(503, "Indisponible", "id")
		lireSimule.mockRejectedValue(erreur)

		await expect(lireProjetDeLaPage("3")).resolves.toBe(erreur)
	})
})
