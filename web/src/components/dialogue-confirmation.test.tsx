import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"

import { DialogueConfirmation } from "./dialogue-confirmation"

const naviguer = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: naviguer }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const action = vi.fn()

function afficher(redirection?: string) {
	render(
		<DialogueConfirmation
			titre="Supprimer le projet ?"
			description="Le projet sera supprimé."
			libelleConfirmation="Supprimer"
			messageSucces="Le projet a été supprimé."
			redirection={redirection}
			action={action}
			declencheur={<Button>Supprimer le projet</Button>}
		/>,
	)
}

async function confirmer() {
	await userEvent.click(screen.getByRole("button", { name: "Supprimer le projet" }))
	await userEvent.click(await screen.findByRole("button", { name: "Supprimer" }))
}

beforeEach(() => {
	action.mockReset()
	naviguer.mockReset()
	vi.mocked(toast.success).mockReset()
})

describe("DialogueConfirmation", () => {
	it("n'exécute rien sans confirmation", async () => {
		afficher()

		await userEvent.click(screen.getByRole("button", { name: "Supprimer le projet" }))
		await userEvent.click(await screen.findByRole("button", { name: "Annuler" }))

		expect(action).not.toHaveBeenCalled()
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
	})

	it("exécute l'action, confirme et ferme le dialogue", async () => {
		action.mockResolvedValue({ statut: "succes" })
		afficher()

		await confirmer()

		expect(action).toHaveBeenCalledTimes(1)
		expect(toast.success).toHaveBeenCalledWith("Le projet a été supprimé.", { duration: 10_000 })
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
		expect(naviguer).not.toHaveBeenCalled()
	})

	it("ouvre la page demandée après le succès", async () => {
		action.mockResolvedValue({ statut: "succes" })
		afficher("/projets")

		await confirmer()

		expect(naviguer).toHaveBeenCalledWith("/projets")
	})

	it("garde le dialogue ouvert et affiche le refus de l'API", async () => {
		action.mockResolvedValue({
			statut: "conflit",
			message: "Le projet possède des tâches : désactivez-le plutôt",
		})
		afficher("/projets")

		await confirmer()

		expect(
			await screen.findByText("Le projet possède des tâches : désactivez-le plutôt"),
		).toBeInTheDocument()
		expect(screen.getByRole("alertdialog")).toBeInTheDocument()
		expect(toast.success).not.toHaveBeenCalled()
		expect(naviguer).not.toHaveBeenCalled()
	})

	it("affiche la référence d'une erreur", async () => {
		action.mockResolvedValue({
			statut: "erreur",
			message: "Service indisponible",
			identifiantCorrelation: "id-503",
		})
		afficher()

		await confirmer()

		expect(await screen.findByText("id-503")).toBeInTheDocument()
	})
})
