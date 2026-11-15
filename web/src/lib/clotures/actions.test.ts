import { refresh } from "next/cache"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { cloturerMois, cloturerTousLesProjets, rouvrirMois } from "@/lib/api/clotures"
import { ApiError } from "@/lib/api/erreurs"
import type { Cloture } from "@/lib/api/modeles"

import { cloturerMoisAction, cloturerTousLesProjetsAction, rouvrirMoisAction } from "./actions"

vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/api/clotures", () => ({
	cloturerMois: vi.fn(),
	cloturerTousLesProjets: vi.fn(),
	rouvrirMois: vi.fn(),
}))

const cloturerSimule = vi.mocked(cloturerMois)
const cloturerTousSimule = vi.mocked(cloturerTousLesProjets)
const rouvrirSimule = vi.mocked(rouvrirMois)
const refreshSimule = vi.mocked(refresh)
const cloture = { id: 1 } as Cloture

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-15T10:00:00Z"))
	for (const simule of [cloturerSimule, cloturerTousSimule, rouvrirSimule, refreshSimule]) {
		simule.mockReset()
	}
})

afterEach(() => {
	vi.useRealTimers()
})

describe("cloturerMoisAction", () => {
	it("clôture un mois terminé pour le projet, puis rafraîchit", async () => {
		cloturerSimule.mockResolvedValue(cloture)

		await expect(cloturerMoisAction(3, "2026-10")).resolves.toEqual({
			statut: "succes",
			message: "Mois clôturé : octobre 2026.",
		})
		expect(cloturerSimule).toHaveBeenCalledWith(3, "2026-10")
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse le mois en cours sans appeler l'API", async () => {
		await expect(cloturerMoisAction(3, "2026-11")).resolves.toMatchObject({
			statut: "invalide",
			erreurs: { mois: expect.stringContaining("novembre 2026 est en cours ou à venir") },
		})
		expect(cloturerSimule).not.toHaveBeenCalled()
	})

	it("refuse un projet invalide sans appeler l'API", async () => {
		await expect(cloturerMoisAction(0, "2026-10")).resolves.toMatchObject({ statut: "erreur" })
		expect(cloturerSimule).not.toHaveBeenCalled()
	})

	it("rattache au mois un mois déjà clôturé (409), et affiche les autres refus", async () => {
		cloturerSimule.mockRejectedValueOnce(new ApiError(409, "Le mois 2026-10 est déjà clôturé", "id"))
		await expect(cloturerMoisAction(3, "2026-10")).resolves.toEqual({
			statut: "invalide",
			erreurs: { mois: "Le mois 2026-10 est déjà clôturé" },
		})

		cloturerSimule.mockRejectedValueOnce(new ApiError(403, "Accès refusé", "id-403"))
		await expect(cloturerMoisAction(3, "2026-10")).resolves.toEqual({
			statut: "erreur",
			message: "Accès refusé",
			identifiantCorrelation: "id-403",
		})
		expect(refreshSimule).not.toHaveBeenCalled()
	})
})

describe("cloturerTousLesProjetsAction", () => {
	it.each([
		[[cloture, cloture, cloture, cloture], "4 projets clôturés pour octobre 2026."],
		[[cloture], "1 projet clôturé pour octobre 2026."],
		[[], "Aucun projet à clôturer pour octobre 2026 : tous l'étaient déjà."],
	])("annonce le nombre de projets clôturés (%#)", async (creees, message) => {
		cloturerTousSimule.mockResolvedValue(creees)

		await expect(cloturerTousLesProjetsAction("2026-10")).resolves.toEqual({ statut: "succes", message })
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse un mois non terminé sans appeler l'API", async () => {
		await expect(cloturerTousLesProjetsAction("2026-12")).resolves.toMatchObject({ statut: "invalide" })
		expect(cloturerTousSimule).not.toHaveBeenCalled()
	})
})

describe("rouvrirMoisAction", () => {
	it("rouvre le mois, puis rafraîchit", async () => {
		rouvrirSimule.mockResolvedValue()

		await expect(rouvrirMoisAction(1)).resolves.toEqual({ statut: "succes" })
		expect(rouvrirSimule).toHaveBeenCalledWith(1)
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse un identifiant invalide, et affiche le refus de l'API", async () => {
		await expect(rouvrirMoisAction(-1)).resolves.toMatchObject({ statut: "erreur" })
		expect(rouvrirSimule).not.toHaveBeenCalled()

		rouvrirSimule.mockRejectedValue(new ApiError(403, "Réservé à l'administrateur", "id"))
		await expect(rouvrirMoisAction(1)).resolves.toMatchObject({
			statut: "erreur",
			message: "Réservé à l'administrateur",
		})
	})
})
