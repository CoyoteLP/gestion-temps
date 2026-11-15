import { beforeEach, describe, expect, it, vi } from "vitest"

import { lireClotureDuMois } from "@/lib/api/clotures"
import { listerTousLesMembres } from "@/lib/api/membres"
import type { Projet } from "@/lib/api/modeles"
import { lireSyntheseDuMois, listerTousLesProjets } from "@/lib/api/projets"
import { listerSaisiesDuProjet, rechercherSaisiesDuProjet } from "@/lib/api/saisies"
import { listerToutesLesTachesDuProjet } from "@/lib/api/taches"

import { lireDonneesEquipe } from "./donnees"
import { lireMois } from "./mois"

vi.mock("@/lib/api/clotures", () => ({ lireClotureDuMois: vi.fn() }))
vi.mock("@/lib/api/membres", () => ({ listerTousLesMembres: vi.fn() }))
vi.mock("@/lib/api/projets", () => ({ listerTousLesProjets: vi.fn(), lireSyntheseDuMois: vi.fn() }))
vi.mock("@/lib/api/saisies", () => ({
	listerSaisiesDuProjet: vi.fn(),
	rechercherSaisiesDuProjet: vi.fn(),
}))
vi.mock("@/lib/api/taches", () => ({ listerToutesLesTachesDuProjet: vi.fn() }))

const projetsSimule = vi.mocked(listerTousLesProjets)
const saisiesSimule = vi.mocked(listerSaisiesDuProjet)
const detailSimule = vi.mocked(rechercherSaisiesDuProjet)
const membresSimule = vi.mocked(listerTousLesMembres)

const projet = (id: number, code: string, monRole: Projet["monRole"]): Projet => ({
	id,
	version: 0,
	code,
	nom: code,
	description: null,
	dateDebut: null,
	dateFin: null,
	actif: true,
	monRole,
	audit: null,
})
const mois = lireMois("2026-10", "2026-11-15")
const pageVide = { contenu: [], page: 1, taille: 20, total: 0, pages: 0 }

beforeEach(() => {
	vi.clearAllMocks()
	projetsSimule.mockResolvedValue([
		projet(1, "ZZZ", "MANAGER"),
		projet(2, "AAA", "BACKUP"),
		projet(3, "CTR", "CONTRIBUTEUR"),
	])
	membresSimule.mockResolvedValue([])
	vi.mocked(listerToutesLesTachesDuProjet).mockResolvedValue([])
	saisiesSimule.mockResolvedValue([])
	detailSimule.mockResolvedValue(pageVide)
	vi.mocked(lireClotureDuMois).mockResolvedValue(null)
})

describe("lireDonneesEquipe", () => {
	it("prend le premier projet proposé par défaut et lit son mois", async () => {
		const donnees = await lireDonneesEquipe(mois, {}, false)

		expect(donnees.projets.map((p) => p.code)).toEqual(["AAA", "ZZZ"])
		expect(donnees.projet?.code).toBe("AAA")
		expect(saisiesSimule).toHaveBeenCalledWith(2, "2026-10-01", "2026-10-31")
		expect(detailSimule).toHaveBeenCalledWith(2, "2026-10-01", "2026-10-31", 1, {
			utilisateurId: undefined,
			tacheId: undefined,
		})
		expect(lireClotureDuMois).toHaveBeenCalledWith(2, "2026-10")
	})

	it("lit le projet, la page, le membre et la tâche filtrés demandés dans l'URL", async () => {
		const donnees = await lireDonneesEquipe(
			mois,
			{ projet: "1", "saisies.page": "3", "saisies.utilisateurId": "7", "saisies.tacheId": "8" },
			false,
		)

		expect(donnees.projet?.code).toBe("ZZZ")
		expect(donnees.membreFiltre).toBe(7)
		expect(donnees.tacheFiltre).toBe(8)
		expect(detailSimule).toHaveBeenCalledWith(1, "2026-10-01", "2026-10-31", 3, {
			utilisateurId: 7,
			tacheId: 8,
		})
	})

	it("ignore un projet dont on n'est ni responsable ni suppléant", async () => {
		const donnees = await lireDonneesEquipe(mois, { projet: "3" }, false)

		expect(donnees.projet?.code).toBe("AAA")
	})

	it("ne lit rien d'autre sans projet proposé (contributeur seulement)", async () => {
		projetsSimule.mockResolvedValue([projet(3, "CTR", "CONTRIBUTEUR")])

		const donnees = await lireDonneesEquipe(mois, {}, false)

		expect(donnees.projet).toBeNull()
		expect(saisiesSimule).not.toHaveBeenCalled()
		expect(membresSimule).not.toHaveBeenCalled()
	})

	it("propose tous les projets à l'administrateur, avec la synthèse du mois à la page demandée", async () => {
		const synthese = { projets: pageVide, totalHeures: 0 }
		vi.mocked(lireSyntheseDuMois).mockResolvedValue(synthese)

		const donnees = await lireDonneesEquipe(
			mois,
			{ projet: "3", "synthese.page": "2", "synthese.cloture": "ouvert" },
			true,
		)

		expect(donnees.projet?.code).toBe("CTR")
		expect(lireSyntheseDuMois).toHaveBeenCalledWith(
			"2026-10",
			expect.objectContaining({ page: 2, filtres: { projet: "", cloture: "ouvert" } }),
		)
		expect(donnees.synthese).toEqual(synthese)
	})

	it("ne lit pas la synthèse pour un responsable", async () => {
		const donnees = await lireDonneesEquipe(mois, {}, false)

		expect(lireSyntheseDuMois).not.toHaveBeenCalled()
		expect(donnees.synthese).toBeNull()
	})
})
