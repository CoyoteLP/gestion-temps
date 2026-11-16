import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { utilisateurCourant } from "@/lib/auth/session"

import { ReserveAdmin } from "./reserve-admin"

vi.mock("@/lib/auth/session", () => ({ utilisateurCourant: vi.fn() }))

async function afficher(estAdmin: boolean) {
	vi.mocked(utilisateurCourant).mockResolvedValue({ nom: "Léa Martin", email: "lea@exemple.fr", estAdmin })
	render(await ReserveAdmin({ children: <button type="button">Nouveau projet</button> }))
}

describe("ReserveAdmin", () => {
	it("affiche les actions d'administration à l'administrateur", async () => {
		await afficher(true)

		expect(screen.getByRole("button", { name: "Nouveau projet" })).toBeInTheDocument()
	})

	it("les masque aux autres utilisateurs", async () => {
		await afficher(false)

		expect(screen.queryByRole("button", { name: "Nouveau projet" })).not.toBeInTheDocument()
	})
})
