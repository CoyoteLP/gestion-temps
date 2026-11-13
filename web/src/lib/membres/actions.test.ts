import { refresh } from "next/cache"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { ajouterMembre, modifierMembre, retirerMembre } from "@/lib/api/membres"

import { ajouterMembreAction, modifierMembreAction, retirerMembreAction } from "./actions"

vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/api/membres", () => ({
	ajouterMembre: vi.fn(),
	modifierMembre: vi.fn(),
	retirerMembre: vi.fn(),
}))

const ajouterSimule = vi.mocked(ajouterMembre)
const modifierSimule = vi.mocked(modifierMembre)
const retirerSimule = vi.mocked(retirerMembre)
const refreshSimule = vi.mocked(refresh)

beforeEach(() => {
	ajouterSimule.mockReset()
	modifierSimule.mockReset()
	retirerSimule.mockReset()
	refreshSimule.mockReset()
})

describe("ajouterMembreAction", () => {
	it("ajoute le membre, puis rafraîchit la page", async () => {
		ajouterSimule.mockResolvedValue({} as never)

		await expect(ajouterMembreAction(3, { utilisateurId: 7, role: "MANAGER" })).resolves.toEqual({
			statut: "succes",
		})
		expect(ajouterSimule).toHaveBeenCalledWith(3, { utilisateurId: 7, role: "MANAGER" })
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse l'absence de choix d'utilisateur sans appeler l'API", async () => {
		await expect(ajouterMembreAction(3, { utilisateurId: 0, role: "MANAGER" })).resolves.toEqual({
			statut: "invalide",
			erreurs: { utilisateurId: "Choisissez un utilisateur" },
		})
		expect(ajouterSimule).not.toHaveBeenCalled()
	})

	it("rattache un utilisateur déjà membre (409) au champ utilisateur", async () => {
		ajouterSimule.mockRejectedValue(new ApiError(409, "L'utilisateur est déjà membre de ce projet", "id"))

		await expect(ajouterMembreAction(3, { utilisateurId: 7, role: "MANAGER" })).resolves.toEqual({
			statut: "invalide",
			erreurs: { utilisateurId: "L'utilisateur est déjà membre de ce projet" },
		})
		expect(refreshSimule).not.toHaveBeenCalled()
	})
})

describe("modifierMembreAction", () => {
	it("change le rôle avec la version lue", async () => {
		modifierSimule.mockResolvedValue({} as never)

		await expect(modifierMembreAction(3, 5, { utilisateurId: 7, role: "BACKUP" }, 1)).resolves.toEqual({
			statut: "succes",
		})
		expect(modifierSimule).toHaveBeenCalledWith(3, 5, { utilisateurId: 7, role: "BACKUP", version: 1 })
	})

	it("signale une modification concurrente (409)", async () => {
		modifierSimule.mockRejectedValue(new ApiError(409, "Modifié entre-temps", "id"))

		await expect(modifierMembreAction(3, 5, { utilisateurId: 7, role: "BACKUP" }, 1)).resolves.toEqual({
			statut: "conflit",
			message: "Modifié entre-temps",
		})
	})
})

describe("retirerMembreAction", () => {
	it("retire le membre, puis rafraîchit la page", async () => {
		retirerSimule.mockResolvedValue()

		await expect(retirerMembreAction(3, 5)).resolves.toEqual({ statut: "succes" })
		expect(retirerSimule).toHaveBeenCalledWith(3, 5)
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse un identifiant invalide", async () => {
		await expect(retirerMembreAction(3, 0)).resolves.toMatchObject({ statut: "erreur" })
		expect(retirerSimule).not.toHaveBeenCalled()
	})
})
