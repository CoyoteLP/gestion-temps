import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch } from "./client"
import { listerCloturesDuMois } from "./clotures"
import { listerTousLesProjets } from "./projets"
import { creerSaisie, listerSaisies, modifierSaisie, supprimerSaisie } from "./saisies"
import { listerToutesLesTaches } from "./taches"

vi.mock("./client", () => ({ apiFetch: vi.fn() }))

const apiFetchSimule = vi.mocked(apiFetch)
const pageVide = { contenu: [], page: 1, taille: 100, total: 0, pages: 0 }

beforeEach(() => {
	apiFetchSimule.mockReset()
	apiFetchSimule.mockResolvedValue(pageVide)
})

describe("saisies", () => {
	it("lit les saisies de l'utilisateur précisé sur la période, par pages de 100", async () => {
		await listerSaisies(7, "2026-11-09", "2026-11-15")

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/saisies-temps", {
			parametres: { utilisateurId: 7, du: "2026-11-09", au: "2026-11-15", page: 1, taille: 100 },
		})
	})

	it("crée, modifie et supprime une saisie", async () => {
		const corps = { tacheId: 8, jour: "2026-11-09", duree: 7.5 }

		await creerSaisie(corps)
		await modifierSaisie(5, { ...corps, version: 1 })
		await supprimerSaisie(5)

		expect(apiFetchSimule).toHaveBeenNthCalledWith(1, "/api/saisies-temps", { methode: "POST", corps })
		expect(apiFetchSimule).toHaveBeenNthCalledWith(2, "/api/saisies-temps/5", {
			methode: "PUT",
			corps: { ...corps, version: 1 },
		})
		expect(apiFetchSimule).toHaveBeenNthCalledWith(3, "/api/saisies-temps/5", { methode: "DELETE" })
	})
})

describe("lectures complètes pour la saisie", () => {
	it("lit les clôtures d'un mois", async () => {
		await listerCloturesDuMois("2026-11")

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/clotures", {
			parametres: { mois: "2026-11", page: 1, taille: 100 },
		})
	})

	it("lit tous les projets et toutes les tâches visibles", async () => {
		await listerTousLesProjets()
		await listerToutesLesTaches()

		expect(apiFetchSimule).toHaveBeenNthCalledWith(1, "/api/projets", {
			parametres: { page: 1, taille: 100 },
		})
		expect(apiFetchSimule).toHaveBeenNthCalledWith(2, "/api/taches", {
			parametres: { page: 1, taille: 100 },
		})
	})
})
