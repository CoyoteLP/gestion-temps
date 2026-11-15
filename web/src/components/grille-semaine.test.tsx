import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Saisie } from "@/lib/api/modeles"
import { calculerGrille } from "@/lib/saisies/grille"
import type { OptionsSaisie } from "@/lib/saisies/options"
import { lireSemaine } from "@/lib/saisies/semaine"

import { GrilleSemaine } from "./grille-semaine"

vi.mock("@/lib/saisies/actions", () => ({
	creerSaisieAction: vi.fn(),
	modifierSaisieAction: vi.fn(),
	supprimerSaisieAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const semaine = lireSemaine("2026-11-09", "2026-11-09")
const jours = semaine.jours.slice(0, 5)
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

describe("GrilleSemaine", () => {
	const saisies = [
		saisie(1, 8, "2026-11-09", 7),
		saisie(2, 8, "2026-11-10", 3.5),
		saisie(3, 9, "2026-11-10", 20.5),
		saisie(4, 9, "2026-11-11", 9),
	]

	beforeEach(() => {
		render(
			<GrilleSemaine
				grille={calculerGrille(saisies, libelleTache)}
				jours={jours}
				dateDuJour="2026-11-10"
				joursClos={new Set(["2026-11-13"])}
				options={options}
			/>,
		)
	})

	it("affiche les heures par tâche et par jour, et les totaux", () => {
		const ligne = screen.getByRole("row", { name: /PJT001 · Dev/ })
		expect(
			within(ligne)
				.getAllByRole("cell")
				.map((cellule) => cellule.textContent),
		).toEqual(["PJT001 · Dev", "7 h", "3,5 h", "", "", "", "10,5 h"])
		const totaux = screen.getByRole("row", { name: /Total du jour/ })
		expect(within(totaux).getByText("40 h")).toBeInTheDocument()
	})

	it("signale une journée qui atteint 24 h", () => {
		expect(screen.getByText("(maximum de la journée atteint)", { exact: false })).toBeInTheDocument()
	})

	it("avertit d'une journée de plus de 8 h, pas d'une journée de 8 h ou moins", () => {
		const totaux = within(screen.getByRole("row", { name: /Total du jour/ })).getAllByRole("cell")

		expect(totaux[3]).toHaveTextContent("9 h (plus de 8 h)")
		expect(totaux[1]).toHaveTextContent(/^7 h$/)
		expect(totaux[2]).not.toHaveTextContent("plus de 8 h")
	})

	it("met en évidence aujourd'hui et propose d'ajouter une saisie chaque jour, sauf jour clôturé", () => {
		expect(screen.getByRole("columnheader", { name: /mar\. 10\/11/ })).toHaveAttribute(
			"aria-current",
			"date",
		)
		expect(
			screen.getByRole("button", { name: "Ajouter une saisie le lundi 9 novembre 2026" }),
		).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /vendredi 13 novembre/ })).not.toBeInTheDocument()
		expect(screen.getByRole("columnheader", { name: /ven\. 13\/11/ })).toHaveTextContent(/Mois clôturé/)
	})
})

describe("GrilleSemaine sans saisie ni possibilité de saisir", () => {
	it("affiche une semaine vide, sans bouton d'ajout", () => {
		render(
			<GrilleSemaine
				grille={calculerGrille([], libelleTache)}
				jours={jours}
				dateDuJour="2026-11-10"
				joursClos={new Set()}
				options={null}
			/>,
		)

		expect(screen.getByText("Aucune saisie cette semaine.")).toBeInTheDocument()
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})
})
