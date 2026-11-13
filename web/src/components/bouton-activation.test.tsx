import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BoutonActivation } from "./bouton-activation"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const action = vi.fn()

beforeEach(() => {
	action.mockReset()
	vi.mocked(toast.success).mockReset()
	vi.mocked(toast.error).mockReset()
	render(<BoutonActivation nom="Léa Martin" action={action} />)
})

const activer = () => userEvent.click(screen.getByRole("button", { name: /Activer/ }))

describe("BoutonActivation", () => {
	it("active le compte et le confirme", async () => {
		action.mockResolvedValue({ statut: "succes" })

		await activer()

		expect(action).toHaveBeenCalledTimes(1)
		expect(toast.success).toHaveBeenCalledWith("Le compte de Léa Martin est activé.", {
			duration: 10_000,
		})
	})

	it("affiche le refus de l'API avec sa référence", async () => {
		action.mockResolvedValue({
			statut: "erreur",
			message: "Accès refusé",
			identifiantCorrelation: "id-403",
		})

		await activer()

		expect(toast.error).toHaveBeenCalledWith("Accès refusé", { description: "Référence : id-403" })
		expect(toast.success).not.toHaveBeenCalled()
	})

	it("signale une fiche modifiée entre-temps", async () => {
		action.mockResolvedValue({ statut: "conflit", message: "Modifiée entre-temps" })

		await activer()

		expect(toast.error).toHaveBeenCalledWith("Modifiée entre-temps", { description: undefined })
	})
})
