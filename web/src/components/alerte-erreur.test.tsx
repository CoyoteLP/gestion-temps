import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AlerteErreur } from "./alerte-erreur"

describe("AlerteErreur", () => {
	it("affiche le message et la référence pour le support", () => {
		render(<AlerteErreur message="Votre compte est désactivé" identifiantCorrelation="id-42" />)

		const alerte = screen.getByRole("alert")
		expect(alerte).toHaveTextContent("Impossible d'afficher ces données")
		expect(alerte).toHaveTextContent("Votre compte est désactivé")
		expect(alerte).toHaveTextContent("Référence : id-42")
	})

	it("n'affiche pas de référence quand il n'y en a pas", () => {
		render(<AlerteErreur titre="Connexion impossible" message="Veuillez vous reconnecter." />)

		expect(screen.getByRole("alert")).toHaveTextContent("Connexion impossible")
		expect(screen.queryByText(/Référence/)).not.toBeInTheDocument()
	})
})
