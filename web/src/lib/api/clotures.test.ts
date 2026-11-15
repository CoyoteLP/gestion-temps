import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch } from "./client"
import {
	cloturerMois,
	cloturerTousLesProjets,
	lireClotureDuMois,
	listerCloturesDuProjet,
	rouvrirMois,
} from "./clotures"
import type { Cloture } from "./modeles"

vi.mock("./client", () => ({ apiFetch: vi.fn() }))

const apiFetchSimule = vi.mocked(apiFetch)
const cloture: Cloture = { id: 4, version: 0, projetId: 3, mois: "2026-10", audit: null }
const page = (contenu: Cloture[]) => ({ contenu, page: 1, taille: 20, total: contenu.length, pages: 1 })

beforeEach(() => {
	apiFetchSimule.mockReset()
})

describe("clôtures", () => {
	it("lit une page des mois clôturés d'un projet", async () => {
		apiFetchSimule.mockResolvedValue(page([cloture]))

		await listerCloturesDuProjet(3, 2)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/clotures", {
			parametres: { projetId: 3, page: 2, taille: 20 },
		})
	})

	it("donne la clôture d'un mois, ou null s'il est ouvert", async () => {
		apiFetchSimule.mockResolvedValueOnce(page([cloture])).mockResolvedValueOnce(page([]))

		await expect(lireClotureDuMois(3, "2026-10")).resolves.toEqual(cloture)
		await expect(lireClotureDuMois(3, "2026-09")).resolves.toBeNull()
		expect(apiFetchSimule).toHaveBeenCalledWith("/api/clotures", {
			parametres: { projetId: 3, mois: "2026-10" },
		})
	})

	it("clôture un mois d'un projet ou de tous les projets, et rouvre un mois", async () => {
		await cloturerMois(3, "2026-10")
		await cloturerTousLesProjets("2026-10")
		await rouvrirMois(4)

		expect(apiFetchSimule).toHaveBeenNthCalledWith(1, "/api/clotures", {
			methode: "POST",
			corps: { projetId: 3, mois: "2026-10" },
		})
		expect(apiFetchSimule).toHaveBeenNthCalledWith(2, "/api/clotures/tous-projets", {
			methode: "POST",
			corps: { mois: "2026-10" },
		})
		expect(apiFetchSimule).toHaveBeenNthCalledWith(3, "/api/clotures/4", { methode: "DELETE" })
	})
})
