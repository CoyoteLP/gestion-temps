import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { describe, expect, it, vi } from "vitest"

import { cloturerTousLesProjetsAction } from "@/lib/clotures/actions"

import { ClotureTousProjets } from "./cloture-tous-projets"

vi.mock("@/lib/clotures/actions", () => ({ cloturerTousLesProjetsAction: vi.fn() }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

describe("ClotureTousProjets", () => {
	it("clôture le mois affiché pour tous les projets ouverts et annonce le résultat", async () => {
		vi.mocked(cloturerTousLesProjetsAction).mockResolvedValue({
			statut: "succes",
			message: "4 projets clôturés pour octobre 2026.",
		})
		render(<ClotureTousProjets mois="2026-09" dateDuJour="2026-11-15" />)

		fireEvent.click(screen.getByRole("button", { name: "Clôturer tous les projets ouverts" }))
		expect(
			screen.getByText(
				"Clôture pour tous les projets actifs qui ne le sont pas encore — septembre 2026.",
			),
		).toBeInTheDocument()
		await userEvent.click(screen.getByRole("button", { name: "Clôturer" }))

		expect(cloturerTousLesProjetsAction).toHaveBeenCalledWith("2026-09")
		expect(toast.success).toHaveBeenCalledWith("4 projets clôturés pour octobre 2026.", {
			duration: 10_000,
		})
	})
})
