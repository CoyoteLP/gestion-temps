import { refresh } from "next/cache"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { Saisie, Utilisateur } from "@/lib/api/modeles"
import { creerSaisie, listerSaisies, modifierSaisie, supprimerSaisie } from "@/lib/api/saisies"
import { lireMonCompte } from "@/lib/api/utilisateurs"

import {
	creerSaisieAction,
	modifierSaisieAction,
	preremplirSemaineAction,
	recopierLundiAction,
	supprimerSaisieAction,
} from "./actions"
import type { ValeursSaisie } from "./schema-saisie"

vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/api/saisies", () => ({
	creerSaisie: vi.fn(),
	listerSaisies: vi.fn(),
	modifierSaisie: vi.fn(),
	supprimerSaisie: vi.fn(),
}))
vi.mock("@/lib/api/utilisateurs", () => ({ lireMonCompte: vi.fn() }))

const creerSimule = vi.mocked(creerSaisie)
const listerSimule = vi.mocked(listerSaisies)
const modifierSimule = vi.mocked(modifierSaisie)
const supprimerSimule = vi.mocked(supprimerSaisie)
const moiSimule = vi.mocked(lireMonCompte)
const refreshSimule = vi.mocked(refresh)

const moi = { id: 7 } as Utilisateur
const valeurs: ValeursSaisie = {
	projetId: 3,
	tacheId: 8,
	jour: "2026-11-09",
	duree: 7.5,
	commentaire: " Revue ",
}
const saisie = (jour: string, tacheId = 8, commentaire: string | null = null): Saisie => ({
	id: 1,
	version: 0,
	utilisateurId: 7,
	tacheId,
	jour,
	duree: 4,
	commentaire,
	audit: null,
})

beforeEach(() => {
	for (const simule of [
		creerSimule,
		listerSimule,
		modifierSimule,
		supprimerSimule,
		moiSimule,
		refreshSimule,
	]) {
		simule.mockReset()
	}
	moiSimule.mockResolvedValue(moi)
	creerSimule.mockResolvedValue({} as Saisie)
})

describe("creerSaisieAction", () => {
	it("crée la saisie de l'utilisateur connecté (sans utilisateur envoyé), puis rafraîchit", async () => {
		await expect(creerSaisieAction(valeurs)).resolves.toEqual({ statut: "succes" })
		expect(creerSimule).toHaveBeenCalledWith({
			tacheId: 8,
			jour: "2026-11-09",
			duree: 7.5,
			commentaire: "Revue",
			version: undefined,
		})
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse une durée hors du pas sans appeler l'API", async () => {
		await expect(creerSaisieAction({ ...valeurs, duree: 7.25 })).resolves.toMatchObject({
			statut: "invalide",
			erreurs: { duree: "La durée doit être un multiple de 0,5 h" },
		})
		expect(creerSimule).not.toHaveBeenCalled()
	})

	it("renvoie le refus de l'API (24 h, mois clôturé…)", async () => {
		creerSimule.mockRejectedValue(new ApiError(422, "Le total de la journée dépasserait 24 h", "id-422"))

		await expect(creerSaisieAction(valeurs)).resolves.toEqual({
			statut: "erreur",
			message: "Le total de la journée dépasserait 24 h",
			identifiantCorrelation: "id-422",
		})
		expect(refreshSimule).not.toHaveBeenCalled()
	})
})

describe("modifierSaisieAction et supprimerSaisieAction", () => {
	it("modifie avec la version lue", async () => {
		modifierSimule.mockResolvedValue({} as Saisie)

		await expect(modifierSaisieAction(5, valeurs, 2)).resolves.toEqual({ statut: "succes" })
		expect(modifierSimule).toHaveBeenCalledWith(5, expect.objectContaining({ tacheId: 8, version: 2 }))
	})

	it("signale une saisie modifiée entre-temps (409)", async () => {
		modifierSimule.mockRejectedValue(new ApiError(409, "Modifiée entre-temps", "id"))

		await expect(modifierSaisieAction(5, valeurs, 2)).resolves.toEqual({
			statut: "conflit",
			message: "Modifiée entre-temps",
		})
	})

	it("refuse un identifiant ou une version invalides", async () => {
		await expect(modifierSaisieAction(0, valeurs, 2)).resolves.toMatchObject({ statut: "erreur" })
		await expect(supprimerSaisieAction(-1)).resolves.toMatchObject({ statut: "erreur" })
		expect(modifierSimule).not.toHaveBeenCalled()
		expect(supprimerSimule).not.toHaveBeenCalled()
	})

	it("supprime puis rafraîchit, ou renvoie le refus d'un mois clôturé", async () => {
		supprimerSimule.mockResolvedValueOnce()
		await expect(supprimerSaisieAction(5)).resolves.toEqual({ statut: "succes" })

		supprimerSimule.mockRejectedValueOnce(new ApiError(422, "Le mois 2026-10 est clôturé", "id"))
		await expect(supprimerSaisieAction(5)).resolves.toMatchObject({
			statut: "erreur",
			message: "Le mois 2026-10 est clôturé",
		})
	})
})

describe("preremplirSemaineAction", () => {
	it("recrée la semaine précédente sur une semaine vide et liste les refus", async () => {
		listerSimule
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([saisie("2026-11-02", 8, "Revue"), saisie("2026-11-03", 9)])
		creerSimule
			.mockResolvedValueOnce({} as Saisie)
			.mockRejectedValueOnce(new ApiError(422, "La tâche est désactivée", "id"))

		await expect(preremplirSemaineAction("2026-11-09")).resolves.toEqual({
			statut: "succes",
			creees: 1,
			refus: [{ jour: "2026-11-10", tacheId: 9, message: "La tâche est désactivée" }],
		})
		expect(listerSimule).toHaveBeenNthCalledWith(1, 7, "2026-11-09", "2026-11-15")
		expect(listerSimule).toHaveBeenNthCalledWith(2, 7, "2026-11-02", "2026-11-08")
		expect(creerSimule).toHaveBeenNthCalledWith(1, {
			tacheId: 8,
			jour: "2026-11-09",
			duree: 4,
			commentaire: "Revue",
		})
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse une semaine qui n'est plus vide, sans rien créer", async () => {
		listerSimule.mockResolvedValueOnce([saisie("2026-11-10")])

		await expect(preremplirSemaineAction("2026-11-09")).resolves.toMatchObject({ statut: "erreur" })
		expect(creerSimule).not.toHaveBeenCalled()
	})

	it("signale une semaine précédente vide", async () => {
		listerSimule.mockResolvedValue([])

		await expect(preremplirSemaineAction("2026-11-09")).resolves.toEqual({
			statut: "erreur",
			message: "La semaine précédente n'a aucune saisie à recopier.",
		})
	})

	it.each(["2026-11-10", "pas une date"])(
		"refuse une semaine qui n'est pas un lundi (%s)",
		async (lundi) => {
			await expect(preremplirSemaineAction(lundi)).resolves.toMatchObject({ statut: "erreur" })
			expect(listerSimule).not.toHaveBeenCalled()
		},
	)

	it("refuse un compte sans fiche", async () => {
		moiSimule.mockResolvedValue(null)

		await expect(preremplirSemaineAction("2026-11-09")).resolves.toMatchObject({ statut: "erreur" })
		expect(listerSimule).not.toHaveBeenCalled()
	})
})

describe("recopierLundiAction", () => {
	it("recopie le lundi sur les jours vides du mardi au vendredi", async () => {
		listerSimule.mockResolvedValue([saisie("2026-11-09"), saisie("2026-11-11")])

		await expect(recopierLundiAction("2026-11-09")).resolves.toEqual({
			statut: "succes",
			creees: 3,
			refus: [],
		})
		expect(creerSimule.mock.calls.map(([corps]) => corps.jour)).toEqual([
			"2026-11-10",
			"2026-11-12",
			"2026-11-13",
		])
	})

	it("ne fait rien quand il n'y a rien à recopier", async () => {
		listerSimule.mockResolvedValue([saisie("2026-11-10")])

		await expect(recopierLundiAction("2026-11-09")).resolves.toMatchObject({ statut: "erreur" })
		expect(creerSimule).not.toHaveBeenCalled()
		expect(refreshSimule).not.toHaveBeenCalled()
	})

	it("renvoie l'erreur de l'API si la semaine ne peut pas être lue", async () => {
		listerSimule.mockRejectedValue(new ApiError(503, "Service indisponible", "id-503"))

		await expect(recopierLundiAction("2026-11-09")).resolves.toEqual({
			statut: "erreur",
			message: "Service indisponible",
			identifiantCorrelation: "id-503",
		})
	})
})
