import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { finaliserInscription } from "@/lib/compte/actions"

import { FinaliserInscription } from "./finaliser-inscription"

vi.mock("@/lib/compte/actions", () => ({ finaliserInscription: vi.fn() }))

const actionSimulee = vi.mocked(finaliserInscription)

beforeEach(() => {
	actionSimulee.mockReset()
	render(<FinaliserInscription />)
})

const finaliser = () => userEvent.click(screen.getByRole("button", { name: /Finaliser mon inscription/ }))

describe("FinaliserInscription", () => {
	it("crée la fiche sans afficher d'erreur quand l'API accepte", async () => {
		actionSimulee.mockResolvedValue({ statut: "succes" })

		await finaliser()

		expect(actionSimulee).toHaveBeenCalled()
		expect(screen.queryByRole("alert")).not.toBeInTheDocument()
	})

	it("affiche le refus de l'API tel quel, avec sa référence", async () => {
		actionSimulee.mockResolvedValue({
			statut: "erreur",
			message: "Votre adresse email doit être vérifiée",
			identifiantCorrelation: "id-422",
		})

		await finaliser()

		const alerte = await screen.findByRole("alert")
		expect(alerte).toHaveTextContent("Inscription impossible")
		expect(alerte).toHaveTextContent("Votre adresse email doit être vérifiée")
		expect(alerte).toHaveTextContent("id-422")
	})
})
