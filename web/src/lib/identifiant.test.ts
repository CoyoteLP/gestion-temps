import { describe, expect, it } from "vitest"

import { lireIdentifiant } from "./identifiant"

describe("lireIdentifiant", () => {
	it.each([
		["1", 1],
		["42", 42],
		["007", 7],
	])("lit l'identifiant %s", (valeur, attendu) => {
		expect(lireIdentifiant(valeur)).toBe(attendu)
	})

	it.each([undefined, "", "0", "-3", "1.5", "abc", "12abc", "9".repeat(16), "99999999999999999"])(
		"refuse %s",
		(valeur) => {
			expect(lireIdentifiant(valeur)).toBeNull()
		},
	)
})
