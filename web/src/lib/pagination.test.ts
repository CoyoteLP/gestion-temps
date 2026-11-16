import { describe, expect, it } from "vitest"

import { lirePage } from "./pagination"

describe("lirePage", () => {
	it.each([
		["2", 2],
		[["3", "4"], 3],
		["1", 1],
	])("accepte un numéro valide : %s", (valeur, attendu) => {
		expect(lirePage(valeur)).toBe(attendu)
	})

	it.each([undefined, "", "0", "-1", "abc", "2.5", "1e3", "9999999999"])(
		"revient à la première page pour une valeur invalide : %s",
		(valeur) => {
			expect(lirePage(valeur)).toBe(1)
		},
	)
})
