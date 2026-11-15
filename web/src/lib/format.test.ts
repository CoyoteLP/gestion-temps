import { describe, expect, it } from "vitest"

import {
	formaterDate,
	formaterDuree,
	formaterJourCourt,
	formaterJourLong,
	formaterPeriode,
	formaterUtilisateur,
	initiales,
	nomComplet,
} from "./format"

describe("formaterDate", () => {
	it("affiche une date ISO au format français", () => {
		expect(formaterDate("2026-11-08")).toBe("08/11/2026")
	})
})

describe("formaterPeriode", () => {
	it.each([
		["2026-01-01", "2026-12-31", "Du 01/01/2026 au 31/12/2026"],
		["2026-01-01", null, "À partir du 01/01/2026"],
		[null, "2026-12-31", "Jusqu'au 31/12/2026"],
		[null, null, "Sans limite"],
		[undefined, undefined, "Sans limite"],
	])("période %s – %s", (debut, fin, attendu) => {
		expect(formaterPeriode(debut, fin)).toBe(attendu)
	})
})

describe("initiales", () => {
	it.each([
		["Jean Dupont", "JD"],
		["jean  pierre dupont", "JP"],
		["Alice", "A"],
		["", ""],
	])("%s → %s", (nom, attendu) => {
		expect(initiales(nom)).toBe(attendu)
	})
})

describe("nomComplet", () => {
	it("place le prénom avant le nom", () => {
		expect(nomComplet({ prenom: "Léa", nom: "Martin" })).toBe("Léa Martin")
	})
})

describe("formaterUtilisateur", () => {
	it("ajoute l'email au nom complet, pour distinguer deux homonymes", () => {
		expect(formaterUtilisateur({ prenom: "Léa", nom: "Martin", email: "lea@exemple.fr" })).toBe(
			"Léa Martin — lea@exemple.fr",
		)
	})
})

describe("durées et jours", () => {
	it.each([
		[7.5, "7,5 h"],
		[24, "24 h"],
		[0, "0 h"],
	])("affiche %s heures en français", (heures, attendu) => {
		expect(formaterDuree(heures)).toBe(attendu)
	})

	it("affiche un jour court et un jour en toutes lettres", () => {
		expect(formaterJourCourt("2026-11-09")).toBe("lun. 09/11")
		expect(formaterJourLong("2026-11-09")).toBe("lundi 9 novembre 2026")
	})
})
