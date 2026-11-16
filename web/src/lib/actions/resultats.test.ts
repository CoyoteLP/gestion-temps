import { describe, expect, it } from "vitest"
import { z } from "zod"

import { ApiError } from "@/lib/api/erreurs"

import { etatErreur, etatInvalide, identifiantValide, versionValide } from "./resultats"

describe("etatErreur", () => {
	it("traduit un 409 en conflit, avec le message de l'API", () => {
		expect(etatErreur(new ApiError(409, "Modifié entre-temps", "id-409"))).toEqual({
			statut: "conflit",
			message: "Modifié entre-temps",
		})
	})

	it.each([400, 403, 404, 422, 503])("traduit un %i en erreur avec sa référence", (statut) => {
		expect(etatErreur(new ApiError(statut, "Refusé", "id"))).toEqual({
			statut: "erreur",
			message: "Refusé",
			identifiantCorrelation: "id",
		})
	})

	it("laisse remonter une erreur qui ne vient pas de l'API", () => {
		expect(() => etatErreur(new Error("panne"))).toThrow("panne")
	})
})

describe("etatInvalide", () => {
	it("garde le premier message de chaque champ", () => {
		const schema = z.object({
			code: z.string().min(1, "obligatoire").max(0, "trop long"),
			nom: z.string(),
		})
		const resultat = schema.safeParse({ code: "", nom: 3 })

		expect(etatInvalide(resultat.error!)).toEqual({
			statut: "invalide",
			erreurs: { code: "obligatoire", nom: expect.any(String) },
		})
	})
})

describe("vérification des arguments", () => {
	it.each([1, 42])("accepte l'identifiant %s", (valeur) => {
		expect(identifiantValide(valeur)).toBe(true)
	})

	it.each([0, -1, 1.5, Number.NaN, "3", null, undefined])("refuse l'identifiant %s", (valeur) => {
		expect(identifiantValide(valeur)).toBe(false)
	})

	it.each([0, 5])("accepte la version %s", (valeur) => {
		expect(versionValide(valeur)).toBe(true)
	})

	it.each([-1, 0.5, "1", undefined])("refuse la version %s", (valeur) => {
		expect(versionValide(valeur)).toBe(false)
	})
})
