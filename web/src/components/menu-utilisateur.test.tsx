import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { lireMonCompte } from "@/lib/api/utilisateurs"
import { utilisateurCourant } from "@/lib/auth/session"

import { MenuUtilisateur } from "./menu-utilisateur"

vi.mock("@/lib/auth/session", () => ({ utilisateurCourant: vi.fn() }))
vi.mock("@/lib/api/utilisateurs", () => ({ lireMonCompte: vi.fn() }))
vi.mock("@/lib/auth/actions", () => ({ seDeconnecter: vi.fn() }))

const compteSimule = vi.mocked(lireMonCompte)

async function afficherMenu() {
	render(await MenuUtilisateur())
}

beforeEach(() => {
	compteSimule.mockReset()
	vi.mocked(utilisateurCourant).mockResolvedValue({
		nom: "Jean Dupont",
		email: "jdupont@lirox.test",
		estAdmin: false,
	})
})

describe("MenuUtilisateur", () => {
	it("affiche le prénom et le nom de la fiche", async () => {
		compteSimule.mockResolvedValue({
			id: 1,
			version: 2,
			email: "jdupont@lirox.test",
			nom: "Durand",
			prenom: "Jeanne",
			actif: true,
			audit: null,
		})

		await afficherMenu()

		expect(screen.getByRole("button", { name: "Menu de Jeanne Durand" })).toBeInTheDocument()
	})

	it("affiche le nom du compte de connexion sans fiche", async () => {
		compteSimule.mockResolvedValue(null)

		await afficherMenu()

		expect(screen.getByRole("button", { name: "Menu de Jean Dupont" })).toBeInTheDocument()
	})

	it("affiche le nom du compte de connexion si l'API est en erreur", async () => {
		compteSimule.mockRejectedValue(new ApiError(503, "Service indisponible", "id-503"))

		await afficherMenu()

		expect(screen.getByRole("button", { name: "Menu de Jean Dupont" })).toBeInTheDocument()
	})

	it("laisse passer une erreur qui ne vient pas de l'API (redirection de Next.js)", async () => {
		compteSimule.mockRejectedValue(new Error("NEXT_REDIRECT"))

		await expect(MenuUtilisateur()).rejects.toThrow("NEXT_REDIRECT")
	})
})
