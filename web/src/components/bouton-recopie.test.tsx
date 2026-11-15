import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BoutonRecopie } from "./bouton-recopie"

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const action = vi.fn()

beforeEach(() => {
	action.mockReset()
	vi.mocked(toast.success).mockReset()
	render(
		<BoutonRecopie
			libelle="Recopier le lundi sur la semaine"
			icone={null}
			titre="Recopier le lundi ?"
			description="4 saisies vont être recopiées."
			action={action}
			libellesTaches={{ 8: "PJT001 · Dev" }}
		/>,
	)
})

async function confirmer() {
	await userEvent.click(screen.getByRole("button", { name: /Recopier le lundi sur la semaine/ }))
	expect(screen.getByText("4 saisies vont être recopiées.")).toBeInTheDocument()
	await userEvent.click(screen.getByRole("button", { name: "Recopier" }))
}

describe("BoutonRecopie", () => {
	it("n'exécute rien sans confirmation", async () => {
		await userEvent.click(screen.getByRole("button", { name: /Recopier le lundi sur la semaine/ }))
		await userEvent.click(screen.getByRole("button", { name: "Annuler" }))

		expect(action).not.toHaveBeenCalled()
	})

	it("confirme une recopie complète et ferme le dialogue", async () => {
		action.mockResolvedValue({ statut: "succes", creees: 4, refus: [] })

		await confirmer()

		expect(toast.success).toHaveBeenCalledWith("4 saisies créées.", { duration: 10_000 })
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
	})

	it("liste les saisies refusées avec leur motif", async () => {
		action.mockResolvedValue({
			statut: "succes",
			creees: 3,
			refus: [{ jour: "2026-11-13", tacheId: 8, message: "La tâche est désactivée" }],
		})

		await confirmer()

		expect(await screen.findByText(/3 saisies créées, 1 refus/)).toBeInTheDocument()
		expect(screen.getByRole("listitem")).toHaveTextContent(
			"vendredi 13 novembre 2026 — PJT001 · Dev : La tâche est désactivée",
		)
		expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument()
		expect(toast.success).not.toHaveBeenCalled()
	})

	it("affiche une erreur sans rien créer", async () => {
		action.mockResolvedValue({ statut: "erreur", message: "La semaine contient déjà des saisies." })

		await confirmer()

		expect(await screen.findByText("La semaine contient déjà des saisies.")).toBeInTheDocument()
		// Le bouton retrouve son libellé à la fin de la transition, juste après l'affichage du message
		expect(await screen.findByRole("button", { name: "Recopier" })).toBeInTheDocument()
	})
})
