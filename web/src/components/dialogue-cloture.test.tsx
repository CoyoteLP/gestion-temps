import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"

import { DialogueCloture } from "./dialogue-cloture"

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const action = vi.fn()

beforeEach(() => {
	action.mockReset()
	vi.mocked(toast.success).mockReset()
})

function afficher(moisImpose?: string) {
	render(
		<DialogueCloture
			titre="Clôturer un mois"
			description="le projet PJT001"
			dateDuJour="2026-11-15"
			moisImpose={moisImpose}
			action={action}
			declencheur={<Button>Ouvrir</Button>}
		/>,
	)
	fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
}

// Le bouton retrouve son libellé à la fin de la transition, juste après l'affichage du résultat
const cloturer = async () => userEvent.click(await screen.findByRole("button", { name: "Clôturer" }))

describe("DialogueCloture", () => {
	it("propose le mois précédent, rappelle les effets et clôture", async () => {
		action.mockResolvedValue({ statut: "succes", message: "Mois clôturé : octobre 2026." })
		afficher()

		expect(screen.getByLabelText("Mois")).toHaveValue("2026-10")
		expect(screen.getByText(/ne pourront plus être créées, modifiées ni supprimées/)).toBeInTheDocument()
		await cloturer()

		expect(action).toHaveBeenCalledWith("2026-10")
		expect(toast.success).toHaveBeenCalledWith("Mois clôturé : octobre 2026.", { duration: 10_000 })
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	it("signale avant l'envoi un mois en cours, sans appeler l'action", async () => {
		afficher()

		fireEvent.change(screen.getByLabelText("Mois"), { target: { value: "2026-11" } })
		expect(screen.getByText(/novembre 2026 est en cours ou à venir/)).toBeInTheDocument()
		await cloturer()

		expect(action).not.toHaveBeenCalled()
	})

	it("affiche le refus de l'API sans fermer le dialogue", async () => {
		action
			.mockResolvedValueOnce({
				statut: "invalide",
				erreurs: { mois: "Le mois 2026-10 est déjà clôturé" },
			})
			.mockResolvedValueOnce({
				statut: "erreur",
				message: "Accès refusé",
				identifiantCorrelation: "id",
			})
		afficher()

		await cloturer()
		expect(await screen.findByText("Le mois 2026-10 est déjà clôturé")).toBeInTheDocument()

		await cloturer()
		expect(await screen.findByText("Accès refusé")).toBeInTheDocument()
		expect(screen.getByRole("dialog")).toBeInTheDocument()
	})

	it("clôture le mois imposé, sans champ de saisie", async () => {
		action.mockResolvedValue({ statut: "succes", message: "Mois clôturé : septembre 2026." })
		afficher("2026-09")

		expect(screen.queryByLabelText("Mois")).not.toBeInTheDocument()
		expect(screen.getByText("Clôture pour le projet PJT001 — septembre 2026.")).toBeInTheDocument()
		await cloturer()

		expect(action).toHaveBeenCalledWith("2026-09")
	})
})
