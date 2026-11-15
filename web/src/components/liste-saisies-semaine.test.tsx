import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Saisie } from "@/lib/api/modeles"
import type { OptionsSaisie } from "@/lib/saisies/options"

import { ListeSaisiesSemaine } from "./liste-saisies-semaine"

vi.mock("@/lib/saisies/actions", () => ({
	creerSaisieAction: vi.fn(),
	modifierSaisieAction: vi.fn(),
	supprimerSaisieAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const libelleTache = (id: number) => (id === 8 ? "PJT001 · Dev" : "PJT001 · Tests")

const saisie = (
	id: number,
	tacheId: number,
	jour: string,
	duree: number,
	commentaire: string | null = null,
): Saisie => ({
	id,
	version: 0,
	utilisateurId: 7,
	tacheId,
	jour,
	duree,
	commentaire,
	audit: null,
})

const options: OptionsSaisie = {
	projets: [{ id: 3, code: "PJT001", nom: "Projet", dateDebut: null, dateFin: null, ouvert: true }],
	taches: [
		{ id: 8, projetId: 3, libelle: "Dev", actif: true },
		{ id: 9, projetId: 3, libelle: "Tests", actif: true },
	],
	cumulParJour: {},
	clotures: [],
}

describe("ListeSaisiesSemaine", () => {
	it("trie par jour puis par tâche, et propose de modifier ou supprimer", () => {
		render(
			<ListeSaisiesSemaine
				saisies={[
					saisie(2, 9, "2026-11-10", 2),
					saisie(1, 8, "2026-11-10", 3, "Revue"),
					saisie(3, 8, "2026-11-09", 7),
				]}
				libelleTache={libelleTache}
				estClose={() => false}
				options={options}
			/>,
		)

		const lignes = screen.getAllByRole("row").slice(1)
		expect(lignes.map((ligne) => within(ligne).getAllByRole("cell")[1].textContent)).toEqual([
			"PJT001 · Dev",
			"PJT001 · Dev",
			"PJT001 · Tests",
		])
		expect(
			screen.getByRole("button", { name: "Modifier la saisie PJT001 · Dev du lundi 9 novembre 2026" }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", {
				name: "Supprimer la saisie PJT001 · Tests du mardi 10 novembre 2026",
			}),
		).toBeInTheDocument()
	})

	it("met en lecture seule une saisie d'un mois clôturé", () => {
		render(
			<ListeSaisiesSemaine
				saisies={[saisie(1, 8, "2026-11-09", 7)]}
				libelleTache={libelleTache}
				estClose={() => true}
				options={options}
			/>,
		)

		expect(screen.getByText("Mois clôturé : saisie en lecture seule")).toBeInTheDocument()
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})
})

describe("DialogueSaisie (par la liste)", () => {
	it("ouvre la modification sur la saisie, avec le temps déjà saisi ce jour", () => {
		render(
			<ListeSaisiesSemaine
				saisies={[saisie(1, 8, "2026-11-09", 3)]}
				libelleTache={libelleTache}
				estClose={() => false}
				options={{ ...options, cumulParJour: { "2026-11-09": 8 } }}
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: /Modifier la saisie/ }))

		expect(screen.getByRole("heading", { name: "Modifier la saisie" })).toBeInTheDocument()
		expect(screen.getByRole("combobox", { name: "Projet" })).toHaveTextContent("PJT001 · Projet")
		expect(screen.getByRole("combobox", { name: "Tâche" })).toHaveTextContent("Dev")
		expect(screen.getByLabelText("Durée (heures)")).toHaveValue(3)
		// 8 h ce jour, dont 3 h de la saisie modifiée
		expect(screen.getByText(/Déjà saisi ce jour : 5 h \(reste 19 h\)/)).toBeInTheDocument()
	})
})
