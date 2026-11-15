import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EtatListe } from "@/lib/listes/etat-liste"

import { apiFetch } from "./client"
import {
	creerProjet,
	lireProjet,
	lireSyntheseDuMois,
	listerProjets,
	modifierProjet,
	supprimerProjet,
} from "./projets"

vi.mock("./client", () => ({ apiFetch: vi.fn() }))

const apiFetchSimule = vi.mocked(apiFetch)

/** État d'une liste sans tri ni filtre, à la page donnée. */
const etat = (page = 1, autres: Partial<EtatListe> = {}): EtatListe => ({
	page,
	tri: null,
	sens: "asc",
	filtres: {},
	...autres,
})

const requete = { code: "APP", nom: "Application", actif: true }

beforeEach(() => {
	apiFetchSimule.mockReset()
	apiFetchSimule.mockResolvedValue({ id: 3 })
})

describe("projets", () => {
	it("liste une page de projets, sans tri ni filtre", async () => {
		await listerProjets(etat(2))

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets", {
			parametres: {
				page: 2,
				taille: 20,
				tri: undefined,
				sens: undefined,
				code: undefined,
				nom: undefined,
				actif: undefined,
			},
		})
	})

	it("transmet le tri, son sens et les filtres de la liste", async () => {
		await listerProjets(
			etat(1, { tri: "nom", sens: "desc", filtres: { code: "APP", nom: "", actif: "inactif" } }),
		)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/projets", {
			parametres: { page: 1, taille: 20, tri: "nom", sens: "desc", code: "APP", nom: "", actif: false },
		})
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

describe("synthèse du mois", () => {
	it("lit une page filtrée de la synthèse des projets pour un mois", async () => {
		await lireSyntheseDuMois("2026-10", etat(2, { filtres: { projet: "pjt", cloture: "ouvert" } }))
		await lireSyntheseDuMois("2026-10", etat(1, { filtres: { projet: "", cloture: "cloture" } }))

		expect(apiFetchSimule).toHaveBeenNthCalledWith(1, "/api/projets/synthese", {
			parametres: { mois: "2026-10", page: 2, taille: 20, projet: "pjt", cloture: false },
		})
		expect(apiFetchSimule).toHaveBeenNthCalledWith(2, "/api/projets/synthese", {
			parametres: { mois: "2026-10", page: 1, taille: 20, projet: "", cloture: true },
		})
	})
})
