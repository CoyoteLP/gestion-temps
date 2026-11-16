import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"
import type { Saisie } from "@/lib/api/modeles"
import { creerSaisieAction, modifierSaisieAction } from "@/lib/saisies/actions"
import type { OptionsSaisie } from "@/lib/saisies/options"

import { DialogueSaisie } from "./dialogue-saisie"

vi.mock("@/lib/saisies/actions", () => ({ creerSaisieAction: vi.fn(), modifierSaisieAction: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const creerSimule = vi.mocked(creerSaisieAction)
const modifierSimule = vi.mocked(modifierSaisieAction)

const options: OptionsSaisie = {
	projets: [
		{
			id: 3,
			code: "PJT001",
			nom: "Projet",
			dateDebut: "2026-01-01",
			dateFin: "2026-11-10",
			ouvert: true,
		},
		{ id: 4, code: "ANC", nom: "Ancien", dateDebut: null, dateFin: null, ouvert: false },
	],
	taches: [
		{ id: 8, projetId: 3, libelle: "Dev", actif: true },
		{ id: 9, projetId: 4, libelle: "Archive", actif: false },
	],
	cumulParJour: { "2026-11-09": 6, "2026-11-10": 0 },
	clotures: ["3:2026-10"],
}

const saisie: Saisie = {
	id: 5,
	version: 2,
	utilisateurId: 7,
	tacheId: 8,
	jour: "2026-11-09",
	duree: 7.5,
	commentaire: "Revue",
	audit: null,
}

beforeEach(() => {
	creerSimule.mockReset()
	modifierSimule.mockReset()
	vi.mocked(toast.success).mockReset()
})

function afficher(avecSaisie: boolean) {
	render(
		<DialogueSaisie
			options={options}
			saisie={avecSaisie ? saisie : undefined}
			jourParDefaut="2026-11-09"
			declencheur={<Button>Ouvrir</Button>}
		/>,
	)
	fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
}

const enregistrer = () => userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

describe("DialogueSaisie", () => {
	it("exige un projet et une tâche à la création", async () => {
		afficher(false)

		await enregistrer()

		expect(await screen.findByText("Choisissez un projet")).toBeInTheDocument()
		expect(screen.getByText("Choisissez une tâche")).toBeInTheDocument()
		expect(creerSimule).not.toHaveBeenCalled()
	})

	it("rappelle le temps déjà saisi ce jour", () => {
		afficher(false)

		expect(screen.getByText(/Déjà saisi ce jour : 6 h \(reste 18 h\)/)).toBeInTheDocument()
	})

	it("rappelle 0 h sur un jour vide de la semaine, et rien hors de la semaine", () => {
		afficher(false)
		const jour = screen.getByLabelText("Jour")

		fireEvent.change(jour, { target: { value: "2026-11-10" } })
		expect(screen.getByText(/Déjà saisi ce jour : 0 h \(reste 24 h\)/)).toBeInTheDocument()

		fireEvent.change(jour, { target: { value: "2026-11-20" } })
		expect(screen.queryByText(/Déjà saisi ce jour/)).not.toBeInTheDocument()
	})

	it("avertit quand la journée dépasse 8 h avec cette saisie, pas à 8 h", () => {
		afficher(false)
		const duree = screen.getByLabelText("Durée (heures)")
		const augmenter = screen.getByRole("button", { name: "Augmenter la durée de 0,5 h" })

		// 6 h déjà saisies : 6 + 2 = 8 h, pas d'avertissement
		fireEvent.click(augmenter)
		fireEvent.click(augmenter)
		fireEvent.click(augmenter)
		expect(duree).toHaveValue(2)
		expect(screen.queryByText(/la journée atteindra/)).not.toBeInTheDocument()

		fireEvent.click(augmenter)
		expect(screen.getByText(/la journée atteindra 8,5 h, au-delà de 8 h/)).toBeInTheDocument()
	})

	it("signale en erreur un total de la journée au-delà de 24 h, pas à 24 h", () => {
		afficher(false)
		const duree = screen.getByLabelText("Durée (heures)")

		// 6 h déjà saisies : 6 + 18 = 24 h, accepté par l'API
		fireEvent.change(duree, { target: { value: "18" } })
		expect(screen.queryByText(/dépasse 24 h/)).not.toBeInTheDocument()
		expect(screen.getByText(/la journée atteindra 24 h/)).toBeInTheDocument()

		fireEvent.change(duree, { target: { value: "18.5" } })
		const erreur = screen.getByText(/Le total de la journée dépasse 24 h/)
		expect(erreur).toHaveTextContent("(24,5 h avec cette saisie) : la saisie sera refusée.")
		expect(erreur.parentElement).toHaveClass("text-destructive")
		expect(screen.queryByText(/la journée atteindra/)).not.toBeInTheDocument()
	})

	it("ajuste la durée par pas de 0,5 h, dans les bornes", () => {
		afficher(false)
		const duree = screen.getByLabelText("Durée (heures)")

		fireEvent.click(screen.getByRole("button", { name: "Augmenter la durée de 0,5 h" }))
		expect(duree).toHaveValue(1)
		fireEvent.click(screen.getByRole("button", { name: "Diminuer la durée de 0,5 h" }))
		fireEvent.click(screen.getByRole("button", { name: "Diminuer la durée de 0,5 h" }))
		expect(duree).toHaveValue(0.5)
	})

	it("modifie la saisie avec la version lue et le confirme", async () => {
		modifierSimule.mockResolvedValue({ statut: "succes" })
		afficher(true)

		fireEvent.click(screen.getByRole("button", { name: "Diminuer la durée de 0,5 h" }))
		await enregistrer()

		expect(modifierSimule).toHaveBeenCalledWith(
			5,
			{ projetId: 3, tacheId: 8, jour: "2026-11-09", duree: 7, commentaire: "Revue" },
			2,
		)
		expect(toast.success).toHaveBeenCalledWith("La saisie a été modifiée.", { duration: 10_000 })
	})

	it("avertit d'un jour hors de la période du projet ou d'un mois clôturé", () => {
		afficher(true)
		const jour = screen.getByLabelText("Jour")

		fireEvent.change(jour, { target: { value: "2026-11-12" } })
		expect(screen.getByRole("status")).toHaveTextContent("hors de la période du projet")
		// L'API refusera l'enregistrement : message d'erreur (rouge)
		expect(screen.getByRole("status")).toHaveClass("text-destructive")

		fireEvent.change(jour, { target: { value: "2026-10-30" } })
		expect(screen.getByRole("status")).toHaveTextContent("Ce mois est clôturé pour ce projet")
		expect(screen.getByRole("status")).toHaveClass("text-destructive")
	})

	it("affiche le refus de l'API sans fermer le dialogue", async () => {
		modifierSimule.mockResolvedValue({
			statut: "erreur",
			message: "Le total de la journée dépasserait 24 h",
			identifiantCorrelation: "id",
		})
		afficher(true)

		await enregistrer()

		expect(await screen.findByText("Le total de la journée dépasserait 24 h")).toBeInTheDocument()
		expect(screen.getByRole("dialog")).toBeInTheDocument()
	})
})
