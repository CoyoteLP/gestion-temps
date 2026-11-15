import { describe, expect, it } from "vitest"

import type { Saisie } from "@/lib/api/modeles"

import { schemaSaisie, type ValeursSaisie, valeursDeLaSaisie, versRequeteSaisie } from "./schema-saisie"

const valide: ValeursSaisie = { projetId: 3, tacheId: 8, jour: "2026-11-09", duree: 7.5, commentaire: "" }

const erreurs = (valeurs: Partial<ValeursSaisie>) => {
	const resultat = schemaSaisie.safeParse({ ...valide, ...valeurs })
	return resultat.success
		? {}
		: Object.fromEntries(resultat.error.issues.map((p) => [p.path[0], p.message]))
}

describe("schemaSaisie", () => {
	it.each([0.5, 7.5, 24])("accepte une durée de %s h", (duree) => {
		expect(erreurs({ duree })).toEqual({})
	})

	it.each([
		[0, "La durée doit être d'au moins 0,5 h"],
		[24.5, "La durée ne doit pas dépasser 24 h"],
		[0.25, "La durée doit être un multiple de 0,5 h"],
	])("refuse une durée de %s h", (duree, message) => {
		expect(erreurs({ duree })).toEqual({ duree: message })
	})

	it("refuse une durée absente (champ vidé)", () => {
		expect(erreurs({ duree: Number.NaN })).toHaveProperty("duree")
	})

	it("exige un projet, une tâche et un jour valide", () => {
		expect(erreurs({ projetId: 0, tacheId: 0, jour: "2026-02-30" })).toEqual({
			projetId: "Choisissez un projet",
			tacheId: "Choisissez une tâche",
			jour: "Choisissez un jour",
		})
	})

	it("limite le commentaire à 500 caractères", () => {
		expect(erreurs({ commentaire: "c".repeat(500) })).toEqual({})
		expect(erreurs({ commentaire: "c".repeat(501) })).toHaveProperty("commentaire")
	})
})

describe("conversions d'une saisie", () => {
	it("envoie la tâche, le jour, la durée et la version, sans utilisateur ni commentaire vide", () => {
		expect(versRequeteSaisie(valide, 2)).toEqual({
			tacheId: 8,
			jour: "2026-11-09",
			duree: 7.5,
			commentaire: undefined,
			version: 2,
		})
	})

	it("propose 0,5 h sur le jour choisi à la création, et reprend la saisie à modifier", () => {
		expect(valeursDeLaSaisie(undefined, 0, "2026-11-11")).toEqual({
			projetId: 0,
			tacheId: 0,
			jour: "2026-11-11",
			duree: 0.5,
			commentaire: "",
		})
		const saisie: Saisie = {
			id: 1,
			version: 0,
			utilisateurId: 7,
			tacheId: 8,
			jour: "2026-11-10",
			duree: 3,
			commentaire: null,
			audit: null,
		}
		expect(valeursDeLaSaisie(saisie, 3, "2026-11-11")).toEqual({
			projetId: 3,
			tacheId: 8,
			jour: "2026-11-10",
			duree: 3,
			commentaire: "",
		})
	})
})
