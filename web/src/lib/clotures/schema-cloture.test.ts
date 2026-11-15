import { describe, expect, it } from "vitest"

import { schemaCloture } from "./schema-cloture"

const erreur = (mois: string) => {
	const resultat = schemaCloture("2026-11-15").safeParse({ mois })
	return resultat.success ? null : resultat.error.issues[0]?.message
}

describe("schemaCloture", () => {
	it.each(["2026-10", "2025-01"])("accepte le mois terminé %s", (mois) => {
		expect(erreur(mois)).toBeNull()
	})

	it("refuse le mois en cours ou un mois à venir, comme l'API", () => {
		expect(erreur("2026-11")).toBe(
			"Seul un mois terminé peut être clôturé : novembre 2026 est en cours ou à venir.",
		)
		expect(erreur("2027-01")).toContain("janvier 2027 est en cours ou à venir")
	})

	it.each(["", "2026-13", "octobre"])("refuse un mois invalide (%s)", (mois) => {
		expect(erreur(mois)).toBe("Choisissez un mois")
	})
})
