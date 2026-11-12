import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { BoutonsConnexion } from "./boutons-connexion"

vi.mock("@/lib/auth/actions", () => ({ seConnecter: vi.fn(), sInscrire: vi.fn() }))

describe("BoutonsConnexion", () => {
	it("propose de se connecter et de créer un compte, avec retour sur la page demandée", () => {
		const { container } = render(<BoutonsConnexion retour="/profil" />)

		expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Créer un compte" })).toBeInTheDocument()
		const retours = container.querySelectorAll<HTMLInputElement>("input[name=retour]")
		expect([...retours].map((champ) => champ.value)).toEqual(["/profil", "/profil"])
	})
})
