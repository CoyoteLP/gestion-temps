import { refresh } from "next/cache"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { Utilisateur } from "@/lib/api/modeles"
import { lireUtilisateur, modifierUtilisateur } from "@/lib/api/utilisateurs"

import { changerActivationAction } from "./actions"

vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/api/utilisateurs", () => ({
	lireUtilisateur: vi.fn(),
	modifierUtilisateur: vi.fn(),
}))

const lireSimule = vi.mocked(lireUtilisateur)
const modifierSimule = vi.mocked(modifierUtilisateur)
const refreshSimule = vi.mocked(refresh)

const fiche: Utilisateur = {
	id: 7,
	version: 4,
	email: "lea@exemple.fr",
	nom: "Martin",
	prenom: "Léa",
	actif: false,
	audit: null,
}

beforeEach(() => {
	lireSimule.mockReset()
	modifierSimule.mockReset()
	refreshSimule.mockReset()
	lireSimule.mockResolvedValue(fiche)
})

describe("changerActivationAction", () => {
	it("active la fiche en la renvoyant complète avec la version affichée", async () => {
		modifierSimule.mockResolvedValue({ ...fiche, actif: true })

		await expect(changerActivationAction(7, true, 4)).resolves.toEqual({ statut: "succes" })
		expect(modifierSimule).toHaveBeenCalledWith(7, {
			email: "lea@exemple.fr",
			nom: "Martin",
			prenom: "Léa",
			actif: true,
			version: 4,
		})
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("désactive la fiche", async () => {
		modifierSimule.mockResolvedValue(fiche)

		await changerActivationAction(7, false, 4)

		expect(modifierSimule).toHaveBeenCalledWith(7, expect.objectContaining({ actif: false }))
	})

	it("signale une fiche modifiée depuis l'affichage (409)", async () => {
		modifierSimule.mockRejectedValue(new ApiError(409, "Modifiée entre-temps", "id"))

		await expect(changerActivationAction(7, true, 3)).resolves.toEqual({
			statut: "conflit",
			message: "Modifiée entre-temps",
		})
		expect(refreshSimule).not.toHaveBeenCalled()
	})

	it("renvoie le refus de l'API si la fiche a disparu", async () => {
		lireSimule.mockRejectedValue(new ApiError(404, "Utilisateur introuvable", "id-404"))

		await expect(changerActivationAction(7, true, 4)).resolves.toMatchObject({
			statut: "erreur",
			message: "Utilisateur introuvable",
		})
		expect(modifierSimule).not.toHaveBeenCalled()
	})

	it.each([
		[0, true, 4],
		[7, "oui", 4],
		[7, true, -1],
	])("refuse des arguments invalides (%s, %s, %s)", async (id, actif, version) => {
		const etat = await changerActivationAction(id, actif as boolean, version)

		expect(etat.statut).toBe("erreur")
		expect(lireSimule).not.toHaveBeenCalled()
	})
})
