import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch } from "./client"
import { creerTache, listerTaches, modifierTache, supprimerTache } from "./taches"

vi.mock("./client", () => ({ apiFetch: vi.fn() }))

const apiFetchSimule = vi.mocked(apiFetch)

const requete = { projetId: 3, libelle: "Développement", actif: true }

beforeEach(() => {
	apiFetchSimule.mockReset()
	apiFetchSimule.mockResolvedValue({ id: 8 })
})

describe("taches", () => {
	it("liste une page des tâches d'un projet", async () => {
		await listerTaches(3, 2)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/taches", {
			parametres: { projetId: 3, page: 2, taille: 20 },
		})
	})

	it("crée une tâche dans son projet", async () => {
		await creerTache(requete)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/taches", { methode: "POST", corps: requete })
	})

	it("modifie une tâche avec la version lue", async () => {
		await modifierTache(8, { ...requete, version: 1 })

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/taches/8", {
			methode: "PUT",
			corps: { ...requete, version: 1 },
		})
	})

	it("supprime une tâche", async () => {
		apiFetchSimule.mockResolvedValue(null)

		await supprimerTache(8)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/taches/8", { methode: "DELETE" })
	})
})
