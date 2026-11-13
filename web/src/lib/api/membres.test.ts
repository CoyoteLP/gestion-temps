import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch } from "./client"
import { ajouterMembre, listerTousLesMembres, modifierMembre, retirerMembre } from "./membres"

vi.mock("./client", () => ({ apiFetch: vi.fn() }))

const apiFetchSimule = vi.mocked(apiFetch)

beforeEach(() => {
	apiFetchSimule.mockReset()
})

describe("membres", () => {
	it("lit tous les membres d'un projet, par pages de 100", async () => {
		apiFetchSimule
			.mockResolvedValueOnce({ contenu: [{ id: 1 }], page: 1, taille: 100, total: 2, pages: 2 })
			.mockResolvedValueOnce({ contenu: [{ id: 2 }], page: 2, taille: 100, total: 2, pages: 2 })

		await expect(listerTousLesMembres(3)).resolves.toEqual([{ id: 1 }, { id: 2 }])
		expect(apiFetchSimule).toHaveBeenNthCalledWith(1, "/api/projets/3/membres", {
			parametres: { page: 1, taille: 100 },
		})
		expect(apiFetchSimule).toHaveBeenNthCalledWith(2, "/api/projets/3/membres", {
			parametres: { page: 2, taille: 100 },
		})
	})

	it("ajoute un membre", async () => {
		await ajouterMembre(3, { utilisateurId: 7, role: "MANAGER" })

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets/3/membres", {
			methode: "POST",
			corps: { utilisateurId: 7, role: "MANAGER" },
		})
	})

	it("modifie le rôle d'un membre avec la version lue", async () => {
		await modifierMembre(3, 5, { utilisateurId: 7, role: "BACKUP", version: 2 })

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets/3/membres/5", {
			methode: "PUT",
			corps: { utilisateurId: 7, role: "BACKUP", version: 2 },
		})
	})

	it("retire un membre", async () => {
		await retirerMembre(3, 5)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets/3/membres/5", { methode: "DELETE" })
	})
})
