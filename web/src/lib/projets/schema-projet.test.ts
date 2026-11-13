import { describe, expect, it } from "vitest"

import type { Projet } from "@/lib/api/modeles"

import { schemaProjet, type ValeursProjet, valeursDuProjet, versRequeteProjet } from "./schema-projet"

const valide: ValeursProjet = {
	code: "APP",
	nom: "Application",
	description: "",
	dateDebut: "",
	dateFin: "",
	actif: true,
}

/** Messages d'erreur par champ, ou objet vide si les valeurs sont valides. */
function erreurs(valeurs: Partial<ValeursProjet>): Record<string, string> {
	const resultat = schemaProjet.safeParse({ ...valide, ...valeurs })
	return resultat.success
		? {}
		: Object.fromEntries(resultat.error.issues.map((probleme) => [probleme.path[0], probleme.message]))
}

describe("schemaProjet", () => {
	it("accepte un projet sans période ni description, et nettoie les blancs", () => {
		const resultat = schemaProjet.parse({ ...valide, code: " APP ", nom: " Application " })

		expect(resultat).toMatchObject({ code: "APP", nom: "Application" })
	})

	it("accepte une période complète, ou ouverte d'un côté", () => {
		expect(erreurs({ dateDebut: "2026-01-01", dateFin: "2026-12-31" })).toEqual({})
		expect(erreurs({ dateDebut: "2026-01-01", dateFin: "2026-01-01" })).toEqual({})
		expect(erreurs({ dateDebut: "2026-01-01" })).toEqual({})
		expect(erreurs({ dateFin: "2026-12-31" })).toEqual({})
	})

	it("refuse une date de fin antérieure à la date de début, sur le champ date de fin", () => {
		expect(erreurs({ dateDebut: "2026-12-31", dateFin: "2026-01-01" })).toEqual({
			dateFin: "La date de fin doit être postérieure ou égale à la date de début",
		})
	})

	it.each(["2026-02-30", "31/12/2026", "demain"])("refuse une date invalide (%s)", (date) => {
		expect(erreurs({ dateDebut: date })).toEqual({
			dateDebut: "La date de début n'est pas une date valide",
		})
	})

	it("refuse un code ou un nom vide ou fait de blancs", () => {
		expect(erreurs({ code: "  ", nom: "" })).toEqual({
			code: "Le code est obligatoire",
			nom: "Le nom est obligatoire",
		})
	})

	it("refuse les valeurs trop longues, aux bornes de l'API", () => {
		expect(
			erreurs({ code: "C".repeat(20), nom: "N".repeat(100), description: "D".repeat(1000) }),
		).toEqual({})
		expect(
			erreurs({ code: "C".repeat(21), nom: "N".repeat(101), description: "D".repeat(1001) }),
		).toEqual({
			code: "Le code ne doit pas dépasser 20 caractères",
			nom: "Le nom ne doit pas dépasser 100 caractères",
			description: "La description ne doit pas dépasser 1000 caractères",
		})
	})
})

describe("valeursDuProjet", () => {
	it("propose un projet actif et vide à la création", () => {
		expect(valeursDuProjet()).toEqual({ ...valide, code: "", nom: "" })
	})

	it("reprend le projet à modifier, champs absents vides", () => {
		const projet = {
			id: 3,
			version: 1,
			code: "APP",
			nom: "Application",
			description: null,
			dateDebut: "2026-01-01",
			dateFin: null,
			actif: false,
			audit: null,
		} satisfies Projet

		expect(valeursDuProjet(projet)).toEqual({
			code: "APP",
			nom: "Application",
			description: "",
			dateDebut: "2026-01-01",
			dateFin: "",
			actif: false,
		})
	})
})

describe("versRequeteProjet", () => {
	it("omet les champs facultatifs vides et la version en création", () => {
		expect(versRequeteProjet(valide)).toEqual({
			code: "APP",
			nom: "Application",
			description: undefined,
			dateDebut: undefined,
			dateFin: undefined,
			actif: true,
			version: undefined,
		})
	})

	it("transmet la période, la description et la version en modification", () => {
		expect(
			versRequeteProjet(
				{ ...valide, description: "Refonte", dateDebut: "2026-01-01", dateFin: "2026-06-30" },
				4,
			),
		).toMatchObject({
			description: "Refonte",
			dateDebut: "2026-01-01",
			dateFin: "2026-06-30",
			version: 4,
		})
	})
})
