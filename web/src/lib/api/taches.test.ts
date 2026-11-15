import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EtatListe } from "@/lib/listes/etat-liste"

import { apiFetch } from "./client"
import {
	creerTache,
	listerTaches,
	listerToutesLesTachesDuProjet,
	modifierTache,
	supprimerTache,
} from "./taches"

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

const requete = { projetId: 3, libelle: "Développement", actif: true }

beforeEach(() => {
	apiFetchSimule.mockReset()
	apiFetchSimule.mockResolvedValue({ id: 8 })
})

describe("taches", () => {
	it("liste une page des tâches d'un projet", async () => {
		await listerTaches(3, etat(2, { tri: "libelle", filtres: { libelle: "rec", actif: "actif" } }))

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/taches", {
			parametres: {
				projetId: 3,
				page: 2,
				taille: 20,
				tri: "libelle",
				sens: "asc",
				libelle: "rec",
				actif: true,
			},
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

describe("toutes les tâches d'un projet", () => {
	it("lit toutes les pages des tâches du projet, actives ou non", async () => {
		apiFetchSimule.mockResolvedValue({ contenu: [], page: 1, taille: 100, total: 0, pages: 0 })

		await listerToutesLesTachesDuProjet(3)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/taches", {
			parametres: { projetId: 3, page: 1, taille: 100 },
		})
	})
})
