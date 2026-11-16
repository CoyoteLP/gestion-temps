import { describe, expect, it } from "vitest"

import { LONGUEUR_MAX_NOM } from "@/lib/constantes"

import { schemaProfil } from "./schema-profil"

describe("schemaProfil", () => {
	it("accepte un nom et un prénom, sans les espaces autour", () => {
		expect(schemaProfil.parse({ nom: "  Dupont ", prenom: "Jean" })).toEqual({
			nom: "Dupont",
			prenom: "Jean",
		})
	})

	it(`accepte ${LONGUEUR_MAX_NOM} caractères`, () => {
		const nom = "a".repeat(LONGUEUR_MAX_NOM)
		expect(schemaProfil.safeParse({ nom, prenom: nom }).success).toBe(true)
	})

	it.each([
		["nom vide", { nom: "", prenom: "Jean" }, "nom", "Le nom est obligatoire"],
		["prénom fait de blancs", { nom: "Dupont", prenom: "   " }, "prenom", "Le prénom est obligatoire"],
		[
			"nom trop long",
			{ nom: "a".repeat(LONGUEUR_MAX_NOM + 1), prenom: "Jean" },
			"nom",
			`Le nom ne doit pas dépasser ${LONGUEUR_MAX_NOM} caractères`,
		],
	])("refuse un %s", (_cas, profil, champ, message) => {
		const resultat = schemaProfil.safeParse(profil)

		expect(resultat.success).toBe(false)
		expect(resultat.error?.issues).toEqual([expect.objectContaining({ path: [champ], message })])
	})
})
