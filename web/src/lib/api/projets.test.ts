import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch } from "./client"
import { creerProjet, lireProjet, listerProjets, modifierProjet, supprimerProjet } from "./projets"

vi.mock("./client", () => ({ apiFetch: vi.fn() }))

const apiFetchSimule = vi.mocked(apiFetch)

const requete = { code: "APP", nom: "Application", actif: true }

beforeEach(() => {
	apiFetchSimule.mockReset()
	apiFetchSimule.mockResolvedValue({ id: 3 })
})

describe("projets", () => {
	it("liste une page de projets", async () => {
		await listerProjets(2)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets", { parametres: { page: 2, taille: 20 } })
	})

	it("lit un projet par son identifiant", async () => {
		await lireProjet(3)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets/3")
	})

	it("crée un projet sans version", async () => {
		await creerProjet(requete)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets", { methode: "POST", corps: requete })
	})

	it("modifie un projet avec la version lue", async () => {
		await modifierProjet(3, { ...requete, version: 4 })

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets/3", {
			methode: "PUT",
			corps: { ...requete, version: 4 },
		})
	})

	it("supprime un projet", async () => {
		apiFetchSimule.mockResolvedValue(null)

		await expect(supprimerProjet(3)).resolves.toBeUndefined()
		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets/3", { methode: "DELETE" })
	})
})
