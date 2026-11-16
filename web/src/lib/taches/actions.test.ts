import { refresh } from "next/cache"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { creerTache, modifierTache, supprimerTache } from "@/lib/api/taches"

import { creerTacheAction, modifierTacheAction, supprimerTacheAction } from "./actions"

vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/api/taches", () => ({
	creerTache: vi.fn(),
	modifierTache: vi.fn(),
	supprimerTache: vi.fn(),
}))

const creerSimule = vi.mocked(creerTache)
const modifierSimule = vi.mocked(modifierTache)
const supprimerSimule = vi.mocked(supprimerTache)
const refreshSimule = vi.mocked(refresh)

const valeurs = { libelle: " Recette ", description: "", actif: true }

beforeEach(() => {
	creerSimule.mockReset()
	modifierSimule.mockReset()
	supprimerSimule.mockReset()
	refreshSimule.mockReset()
})

describe("creerTacheAction", () => {
	it("crée la tâche dans son projet, puis rafraîchit la page", async () => {
		creerSimule.mockResolvedValue({} as never)

		await expect(creerTacheAction(3, valeurs)).resolves.toEqual({ statut: "succes" })
		expect(creerSimule).toHaveBeenCalledWith({
			projetId: 3,
			libelle: "Recette",
			description: undefined,
			actif: true,
			version: undefined,
		})
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse un libellé vide sans appeler l'API", async () => {
		await expect(creerTacheAction(3, { ...valeurs, libelle: "" })).resolves.toEqual({
			statut: "invalide",
			erreurs: { libelle: "Le libellé est obligatoire" },
		})
		expect(creerSimule).not.toHaveBeenCalled()
	})

	it("renvoie le refus de l'API sans rafraîchir", async () => {
		creerSimule.mockRejectedValue(new ApiError(422, "Le projet est inactif", "id-422"))

		await expect(creerTacheAction(3, valeurs)).resolves.toMatchObject({
			statut: "erreur",
			message: "Le projet est inactif",
		})
		expect(refreshSimule).not.toHaveBeenCalled()
	})
})

describe("modifierTacheAction", () => {
	it("modifie la tâche avec la version lue, sans changer de projet", async () => {
		modifierSimule.mockResolvedValue({} as never)

		await expect(modifierTacheAction(8, 3, valeurs, 2)).resolves.toEqual({ statut: "succes" })
		expect(modifierSimule).toHaveBeenCalledWith(8, expect.objectContaining({ projetId: 3, version: 2 }))
	})

	it("signale une modification concurrente (409)", async () => {
		modifierSimule.mockRejectedValue(new ApiError(409, "Modifiée entre-temps", "id"))

		await expect(modifierTacheAction(8, 3, valeurs, 2)).resolves.toEqual({
			statut: "conflit",
			message: "Modifiée entre-temps",
		})
	})

	it("refuse une version invalide", async () => {
		await expect(modifierTacheAction(8, 3, valeurs, Number.NaN)).resolves.toMatchObject({
			statut: "erreur",
		})
		expect(modifierSimule).not.toHaveBeenCalled()
	})
})

describe("supprimerTacheAction", () => {
	it("supprime la tâche, puis rafraîchit la page", async () => {
		supprimerSimule.mockResolvedValue()

		await expect(supprimerTacheAction(8)).resolves.toEqual({ statut: "succes" })
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("renvoie le refus de l'API pour une tâche qui a des saisies", async () => {
		supprimerSimule.mockRejectedValue(
			new ApiError(409, "La tâche possède des saisies de temps : désactivez-la plutôt", "id"),
		)

		await expect(supprimerTacheAction(8)).resolves.toEqual({
			statut: "conflit",
			message: "La tâche possède des saisies de temps : désactivez-la plutôt",
		})
		expect(refreshSimule).not.toHaveBeenCalled()
	})
})
