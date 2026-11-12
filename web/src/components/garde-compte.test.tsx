import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { Utilisateur } from "@/lib/api/modeles"
import { lireMonCompte } from "@/lib/api/utilisateurs"
import { utilisateurCourant } from "@/lib/auth/session"

import { GardeCompte } from "./garde-compte"

vi.mock("@/lib/auth/session", () => ({ utilisateurCourant: vi.fn() }))
vi.mock("@/lib/api/utilisateurs", () => ({ lireMonCompte: vi.fn() }))
vi.mock("@/lib/compte/actions", () => ({ finaliserInscription: vi.fn() }))

const utilisateurSimule = vi.mocked(utilisateurCourant)
const compteSimule = vi.mocked(lireMonCompte)

const fiche: Utilisateur = {
	id: 7,
	version: 0,
	email: "nouveau@exemple.fr",
	nom: "Martin",
	prenom: "Léa",
	actif: true,
	audit: null,
}

function connecte(estAdmin: boolean) {
	utilisateurSimule.mockResolvedValue({ nom: "Léa Martin", email: fiche.email, estAdmin })
}

async function afficherGarde() {
	render(await GardeCompte({ children: <p>Contenu de la page</p> }))
}

beforeEach(() => {
	compteSimule.mockReset()
})

describe("GardeCompte", () => {
	it("affiche la page à un utilisateur dont la fiche est active", async () => {
		connecte(false)
		compteSimule.mockResolvedValue(fiche)

		await afficherGarde()

		expect(screen.getByText("Contenu de la page")).toBeInTheDocument()
	})

	it("affiche la page à un administrateur sans consulter sa fiche", async () => {
		connecte(true)

		await afficherGarde()

		expect(screen.getByText("Contenu de la page")).toBeInTheDocument()
		expect(compteSimule).not.toHaveBeenCalled()
	})

	it("remplace la page par l'attente de validation si la fiche est inactive", async () => {
		connecte(false)
		compteSimule.mockResolvedValue({ ...fiche, actif: false })

		await afficherGarde()

		expect(screen.queryByText("Contenu de la page")).not.toBeInTheDocument()
		expect(screen.getByText("Compte en attente de validation")).toBeInTheDocument()
	})

	it("remplace la page par l'inscription à finaliser s'il n'y a pas de fiche", async () => {
		connecte(false)
		compteSimule.mockResolvedValue(null)

		await afficherGarde()

		expect(screen.queryByText("Contenu de la page")).not.toBeInTheDocument()
		expect(screen.getByText("Inscription à finaliser")).toBeInTheDocument()
	})

	it("affiche l'erreur de l'API si la fiche ne peut pas être lue", async () => {
		connecte(false)
		compteSimule.mockRejectedValue(
			new ApiError(503, "Le service est momentanément indisponible", "id-503"),
		)

		await afficherGarde()

		expect(screen.queryByText("Contenu de la page")).not.toBeInTheDocument()
		expect(screen.getByRole("alert")).toHaveTextContent("id-503")
	})
})
