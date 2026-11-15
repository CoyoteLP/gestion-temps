import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { SelectionProjetEquipe } from "./selection-projet-equipe"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
// Doublure : liste native à la place du menu Radix (que jsdom n'ouvre pas), pour tester le choix
vi.mock("@/components/ui/select", () => ({
	Select: ({
		value,
		onValueChange,
		children,
	}: {
		value: string
		onValueChange: (valeur: string) => void
		children: ReactNode
	}) => (
		<select
			aria-label="Projet"
			value={value}
			onChange={(evenement) => onValueChange(evenement.target.value)}
		>
			{children}
		</select>
	),
	SelectTrigger: () => null,
	SelectValue: () => null,
	SelectContent: ({ children }: { children: ReactNode }) => children,
	SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
		<option value={value}>{children}</option>
	),
}))

describe("SelectionProjetEquipe", () => {
	it("affiche le projet choisi et ouvre le même mois pour un autre projet", () => {
		render(
			<SelectionProjetEquipe
				projets={[
					{ id: 2, code: "AAA", nom: "Alpha" },
					{ id: 3, code: "PJT001", nom: "Projet" },
				]}
				projetId={2}
				mois="2026-10"
			/>,
		)

		const choix = screen.getByRole("combobox", { name: "Projet" })
		expect(choix).toHaveValue("2")
		expect(screen.getByRole("option", { name: "PJT001 · Projet" })).toBeInTheDocument()
		fireEvent.change(choix, { target: { value: "3" } })

		expect(push).toHaveBeenCalledWith("/equipe?projet=3&mois=2026-10")
	})
})
