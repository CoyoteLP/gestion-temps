import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { creerProjet, modifierProjet, supprimerProjet } from "@/lib/api/projets"

import { creerProjetAction, modifierProjetAction, supprimerProjetAction } from "./actions"
import type { ValeursProjet } from "./schema-projet"

vi.mock("@/lib/api/projets", () => ({
	creerProjet: vi.fn(),
	modifierProjet: vi.fn(),
	supprimerProjet: vi.fn(),
}))

const creerSimule = vi.mocked(creerProjet)
const modifierSimule = vi.mocked(modifierProjet)
const supprimerSimule = vi.mocked(supprimerProjet)

const valeurs: ValeursProjet = {
	code: " APP ",
	nom: "Application",
	description: "",
	dateDebut: "2026-01-01",
	dateFin: "",
	actif: true,
}

beforeEach(() => {
	creerSimule.mockReset()
	modifierSimule.mockReset()
	supprimerSimule.mockReset()
})

describe("creerProjetAction", () => {
	it("crée le projet nettoyé et renvoie son identifiant", async () => {
		creerSimule.mockResolvedValue({ id: 12 } as never)

		await expect(creerProjetAction(valeurs)).resolves.toEqual({ statut: "succes", id: 12 })
		expect(creerSimule).toHaveBeenCalledWith({
			code: "APP",
			nom: "Application",
			description: undefined,
			dateDebut: "2026-01-01",
			dateFin: undefined,
			actif: true,
			version: undefined,
		})
	})

	it("refuse des valeurs invalides sans appeler l'API", async () => {
		const etat = await creerProjetAction({ ...valeurs, dateFin: "2025-12-31" })

		expect(etat).toEqual({
			statut: "invalide",
			erreurs: { dateFin: "La date de fin doit être postérieure ou égale à la date de début" },
		})
		expect(creerSimule).not.toHaveBeenCalled()
	})

	it("rattache un code déjà utilisé (409) au champ code", async () => {
		creerSimule.mockRejectedValue(new ApiError(409, "Un projet avec le code 'APP' existe déjà", "id"))

		await expect(creerProjetAction(valeurs)).resolves.toEqual({
			statut: "invalide",
			erreurs: { code: "Un projet avec le code 'APP' existe déjà" },
		})
	})

	it("renvoie les autres refus de l'API avec leur référence", async () => {
		creerSimule.mockRejectedValue(new ApiError(403, "Accès refusé", "id-403"))

		await expect(creerProjetAction(valeurs)).resolves.toEqual({
			statut: "erreur",
			message: "Accès refusé",
			identifiantCorrelation: "id-403",
		})
	})
})

describe("modifierProjetAction", () => {
	it("modifie le projet avec la version lue", async () => {
		modifierSimule.mockResolvedValue({} as never)

		await expect(modifierProjetAction(12, valeurs, 3)).resolves.toEqual({ statut: "succes", id: 12 })
		expect(modifierSimule).toHaveBeenCalledWith(12, expect.objectContaining({ code: "APP", version: 3 }))
	})

	it("signale une modification concurrente (409)", async () => {
		modifierSimule.mockRejectedValue(new ApiError(409, "Modifié entre-temps", "id"))

		await expect(modifierProjetAction(12, valeurs, 3)).resolves.toEqual({
			statut: "conflit",
			message: "Modifié entre-temps",
		})
	})

	it.each([
		[0, 3],
		[12, -1],
	])("refuse un identifiant ou une version invalides (%s, %s)", async (id, version) => {
		const etat = await modifierProjetAction(id, valeurs, version)

		expect(etat.statut).toBe("erreur")
		expect(modifierSimule).not.toHaveBeenCalled()
	})
})

describe("supprimerProjetAction", () => {
	it("supprime le projet", async () => {
		supprimerSimule.mockResolvedValue()

		await expect(supprimerProjetAction(12)).resolves.toEqual({ statut: "succes" })
		expect(supprimerSimule).toHaveBeenCalledWith(12)
	})

	it("renvoie le refus de l'API pour un projet qui a des tâches", async () => {
		supprimerSimule.mockRejectedValue(
			new ApiError(409, "Le projet possède des tâches : désactivez-le plutôt", "id"),
		)

		await expect(supprimerProjetAction(12)).resolves.toEqual({
			statut: "conflit",
			message: "Le projet possède des tâches : désactivez-le plutôt",
		})
	})

	it("refuse un identifiant invalide", async () => {
		await expect(supprimerProjetAction(-4)).resolves.toMatchObject({ statut: "erreur" })
		expect(supprimerSimule).not.toHaveBeenCalled()
	})
})
