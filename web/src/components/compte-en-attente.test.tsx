import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CompteEnAttente } from "./compte-en-attente"

vi.mock("@/lib/compte/actions", () => ({ finaliserInscription: vi.fn() }))

describe("CompteEnAttente", () => {
	it("annonce une fiche en attente de validation, sans action possible", () => {
		render(<CompteEnAttente etat="inactif" />)

		expect(screen.getByText("Compte en attente de validation")).toBeInTheDocument()
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})

	it("propose de finaliser l'inscription quand il n'y a pas de fiche", () => {
		render(<CompteEnAttente etat="absent" />)

		expect(screen.getByText("Inscription à finaliser")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Finaliser mon inscription/ })).toBeInTheDocument()
	})
})
