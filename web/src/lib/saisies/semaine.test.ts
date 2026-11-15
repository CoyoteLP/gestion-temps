import { describe, expect, it } from "vitest"

import { aujourdhui, decaler, estJourValide, joursAffiches, lireSemaine, lundiDe, moisDe } from "./semaine"

describe("aujourdhui", () => {
	it("donne la date à Paris, même quand le jour a déjà changé là-bas", () => {
		expect(aujourdhui(new Date("2026-11-14T23:30:00Z"))).toBe("2026-11-15")
		expect(aujourdhui(new Date("2026-11-14T12:00:00Z"))).toBe("2026-11-14")
	})
})

describe("dates", () => {
	it.each(["2026-11-09", "2028-02-29"])("accepte la date %s", (jour) => {
		expect(estJourValide(jour)).toBe(true)
	})

	it.each([undefined, "", "2026-02-30", "09/11/2026", "2026-11-9"])("refuse %s", (jour) => {
		expect(estJourValide(jour)).toBe(false)
	})

	it("ramène une date à son lundi, dimanche compris", () => {
		expect(lundiDe("2026-11-12")).toBe("2026-11-09")
		expect(lundiDe("2026-11-09")).toBe("2026-11-09")
		expect(lundiDe("2026-11-15")).toBe("2026-11-09")
	})

	it("décale d'un nombre de jours, à travers les mois et les années", () => {
		expect(decaler("2026-12-28", 7)).toBe("2027-01-04")
		expect(decaler("2026-03-02", -7)).toBe("2026-02-23")
	})

	it("donne le mois d'une date", () => {
		expect(moisDe("2026-11-09")).toBe("2026-11")
	})
})

describe("lireSemaine", () => {
	it("lit le lundi de l'URL, avec les sept jours et les semaines voisines", () => {
		expect(lireSemaine("2026-11-09", "2026-01-01")).toEqual({
			lundi: "2026-11-09",
			jours: [
				"2026-11-09",
				"2026-11-10",
				"2026-11-11",
				"2026-11-12",
				"2026-11-13",
				"2026-11-14",
				"2026-11-15",
			],
			precedente: "2026-11-02",
			suivante: "2026-11-16",
		})
	})

	it("ramène une date quelconque à son lundi", () => {
		expect(lireSemaine("2026-11-13", "2026-01-01").lundi).toBe("2026-11-09")
	})

	it.each([undefined, "", "demain", "2026-13-01", ["x", "2026-11-09"]])(
		"prend la semaine en cours pour une valeur invalide (%s)",
		(valeur) => {
			expect(lireSemaine(valeur, "2026-11-14").lundi).toBe("2026-11-09")
		},
	)

	it("passe d'une année à l'autre", () => {
		expect(lireSemaine("2027-01-01", "2026-01-01")).toMatchObject({
			lundi: "2026-12-28",
			suivante: "2027-01-04",
		})
	})
})

describe("joursAffiches", () => {
	const semaine = lireSemaine("2026-11-09", "2026-11-09")

	it("affiche du lundi au vendredi sans saisie le week-end", () => {
		expect(joursAffiches(semaine, new Set(["2026-11-10"]))).toEqual(semaine.jours.slice(0, 5))
	})

	it("ajoute le samedi ou le dimanche s'ils ont des saisies", () => {
		expect(joursAffiches(semaine, new Set(["2026-11-15"]))).toEqual([
			...semaine.jours.slice(0, 5),
			"2026-11-15",
		])
	})
})
