import { describe, expect, it } from "vitest"

import { schemaTache, valeursDeLaTache, versRequeteTache } from "./schema-tache"

describe("schemaTache", () => {
	it("accepte une tâche sans description et nettoie les blancs", () => {
		expect(schemaTache.parse({ libelle: " Recette ", description: "", actif: true })).toEqual({
			libelle: "Recette",
			description: "",
			actif: true,
		})
	})

	it("refuse un libellé vide", () => {
		const resultat = schemaTache.safeParse({ libelle: " ", description: "", actif: true })

		expect(resultat.error?.issues.map((probleme) => probleme.message)).toEqual([
			"Le libellé est obligatoire",
		])
	})

	it("refuse un libellé ou une description trop longs, aux bornes de l'API", () => {
		expect(
			schemaTache.safeParse({ libelle: "L".repeat(100), description: "D".repeat(1000), actif: true })
				.success,
		).toBe(true)
		const resultat = schemaTache.safeParse({
			libelle: "L".repeat(101),
			description: "D".repeat(1001),
			actif: true,
		})
		expect(resultat.error?.issues.map((probleme) => probleme.path[0])).toEqual(["libelle", "description"])
	})
})

describe("conversions d'une tâche", () => {
	it("propose une tâche active et vide à la création", () => {
		expect(valeursDeLaTache()).toEqual({ libelle: "", description: "", actif: true })
	})

	it("reprend la tâche à modifier, description absente vide", () => {
		expect(valeursDeLaTache({ libelle: "Recette", description: null, actif: false })).toEqual({
			libelle: "Recette",
			description: "",
			actif: false,
		})
	})

	it("rattache la requête à son projet et omet la description vide", () => {
		expect(versRequeteTache(3, { libelle: "Recette", description: "", actif: true }, 2)).toEqual({
			projetId: 3,
			libelle: "Recette",
			description: undefined,
			actif: true,
			version: 2,
		})
	})
})
