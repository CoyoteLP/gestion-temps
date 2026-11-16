import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { SyntheseProjet } from "@/lib/api/modeles"

import { SyntheseMois } from "./synthese-mois"

vi.mock("@/lib/clotures/actions", () => ({
	cloturerMoisAction: vi.fn(),
	cloturerTousLesProjetsAction: vi.fn(),
	rouvrirMoisAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const projets: SyntheseProjet[] = [
	{ projetId: 3, code: "PJT001", nom: "Projet", actif: true, totalHeures: 152.5, clotureId: 9 },
	{ projetId: 4, code: "PJT002", nom: "Refonte", actif: true, totalHeures: 0, clotureId: null },
	{ projetId: 5, code: "ANC", nom: "Ancien", actif: false, totalHeures: 3, clotureId: null },
]

function afficher(mois: string, parametres = {}) {
	render(
		<SyntheseMois
			synthese={{
				projets: { contenu: projets, page: 1, taille: 20, total: 3, pages: 1 },
				totalHeures: 155.5,
			}}
			mois={mois}
			dateDuJour="2026-11-15"
			parametres={parametres}
		/>,
	)
}

const ligne = (nom: RegExp) => screen.getByRole("row", { name: nom })

describe("SyntheseMois", () => {
	it("donne pour chaque projet son statut et son total, avec un lien vers son détail", () => {
		afficher("2026-10")

		expect(ligne(/PJT001/)).toHaveTextContent("Clôturé")
		expect(ligne(/PJT001/)).toHaveTextContent("152,5 h")
		expect(ligne(/PJT002/)).toHaveTextContent("Ouvert")
		expect(ligne(/ANC/)).toHaveTextContent("Inactif")
		expect(within(ligne(/PJT002/)).getByRole("link", { name: "PJT002 · Refonte" })).toHaveAttribute(
			"href",
			"/equipe?projet=4&mois=2026-10",
		)
	})

	it("affiche le total général des projets filtrés en pied de liste", () => {
		afficher("2026-10")

		expect(ligne(/Total général/)).toHaveTextContent("155,5 h")
	})

	it("filtre par projet et par statut, en gardant le mois", () => {
		afficher("2026-10", { projet: "3", mois: "2026-10", "synthese.cloture": "ouvert" })

		expect(screen.getByRole("searchbox", { name: "Filtrer par projet" })).toBeInTheDocument()
		expect(screen.getByRole("combobox", { name: "Filtrer par statut" })).toHaveTextContent("Ouverts")
		expect(screen.getByRole("link", { name: /Effacer les filtres/ })).toHaveAttribute(
			"href",
			"/equipe?projet=3&mois=2026-10",
		)
	})

	it("propose de rouvrir un projet clôturé et de clôturer les projets ouverts d'un mois terminé", () => {
		afficher("2026-10")

		expect(
			within(ligne(/PJT001/)).getByRole("button", { name: "Rouvrir octobre 2026 pour PJT001" }),
		).toBeInTheDocument()
		expect(
			within(ligne(/PJT002/)).getByRole("button", { name: "Clôturer octobre 2026 pour PJT002" }),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Clôturer tous les projets ouverts" })).toBeInTheDocument()
	})

	it("ne propose pas de clôturer le mois en cours, seulement de rouvrir", () => {
		afficher("2026-11")

		expect(screen.queryByRole("button", { name: /^Clôturer/ })).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Rouvrir novembre 2026 pour PJT001" })).toBeInTheDocument()
	})
})
