import { describe, expect, it } from "vitest"

import { decalerMois, estMoisTermine, estMoisValide, lireMois } from "./mois"

describe("estMoisValide", () => {
	it.each(["2026-01", "2026-12"])("accepte %s", (mois) => {
		expect(estMoisValide(mois)).toBe(true)
	})

	it.each([undefined, "", "2026-13", "2026-00", "2026-1", "10/2026", 202610, ["2026-10"]])(
		"refuse %s",
		(mois) => {
			expect(estMoisValide(mois)).toBe(false)
		},
	)
})

describe("lireMois", () => {
	it("lit le mois de l'URL, avec ses bornes et ses voisins", () => {
		expect(lireMois("2026-02", "2026-11-15")).toEqual({
			mois: "2026-02",
			premierJour: "2026-02-01",
			dernierJour: "2026-02-28",
			precedent: "2026-01",
			suivant: "2026-03",
		})
	})

	it("passe d'une année à l'autre", () => {
		expect(lireMois("2026-12", "2026-11-15")).toMatchObject({ precedent: "2026-11", suivant: "2027-01" })
		expect(lireMois("2028-02", "2026-11-15").dernierJour).toBe("2028-02-29")
	})

	it.each([undefined, "", "demain", "2026-13", ["x"]])(
		"prend le mois en cours pour une valeur invalide (%s)",
		(valeur) => {
			expect(lireMois(valeur, "2026-11-15").mois).toBe("2026-11")
		},
	)
})

describe("mois terminé", () => {
	it("n'accepte qu'un mois entièrement passé", () => {
		expect(estMoisTermine("2026-10", "2026-11-01")).toBe(true)
		expect(estMoisTermine("2025-12", "2026-11-15")).toBe(true)
		expect(estMoisTermine("2026-11", "2026-11-30")).toBe(false)
		expect(estMoisTermine("2026-12", "2026-11-15")).toBe(false)
	})

	it("décale d'un nombre de mois", () => {
		expect(decalerMois("2026-01", -1)).toBe("2025-12")
		expect(decalerMois("2026-11", 2)).toBe("2027-01")
	})
})
