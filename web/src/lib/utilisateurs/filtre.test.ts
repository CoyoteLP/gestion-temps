import { describe, expect, it } from "vitest"

import { lireFiltreUtilisateurs } from "./filtre"

describe("lireFiltreUtilisateurs", () => {
	it.each([
		["en-attente", false],
		["actifs", true],
		["tous", undefined],
	])("traduit %s en filtre de statut", (valeur, actif) => {
		expect(lireFiltreUtilisateurs(valeur)).toMatchObject({ valeur, actif })
	})

	it.each([undefined, "", "inconnu", ["inconnu", "tous"]])(
		"affiche les comptes en attente par défaut (%s)",
		(valeur) => {
			expect(lireFiltreUtilisateurs(valeur)).toMatchObject({ valeur: "en-attente", actif: false })
		},
	)

	it("retient le premier paramètre s'il est répété", () => {
		expect(lireFiltreUtilisateurs(["actifs", "tous"]).valeur).toBe("actifs")
	})
})
