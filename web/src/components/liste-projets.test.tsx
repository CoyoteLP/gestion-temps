import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { Projet } from "@/lib/api/modeles"
import { listerProjets } from "@/lib/api/projets"

import { ListeProjets } from "./liste-projets"

vi.mock("@/lib/api/projets", () => ({ listerProjets: vi.fn() }))

const listerSimule = vi.mocked(listerProjets)

const projet: Projet = {
	id: 12,
	version: 0,
	code: "APP",
	nom: "Application",
	description: null,
	dateDebut: null,
	dateFin: null,
	actif: true,
	audit: null,
}

beforeEach(() => {
	listerSimule.mockReset()
	listerSimule.mockResolvedValue({ contenu: [projet], page: 1, taille: 20, total: 1, pages: 1 })
})

async function afficher(estAdmin: boolean) {
	render(await ListeProjets({ page: 2, estAdmin }))
}

describe("ListeProjets", () => {
	it("liste les projets de la page demandée ; le nom ouvre la fiche", async () => {
		await afficher(false)

		expect(listerSimule).toHaveBeenCalledWith(2)
		expect(screen.getByRole("link", { name: "Application" })).toHaveAttribute("href", "/projets/12")
		expect(screen.getByText("Sans limite")).toBeInTheDocument()
	})

	it("donne à l'administrateur l'accès direct à la modification", async () => {
		await afficher(true)

		expect(screen.getByRole("link", { name: "Modifier le projet Application" })).toHaveAttribute(
			"href",
			"/projets/12/modifier",
		)
	})

	it("ne le propose pas aux autres utilisateurs", async () => {
		await afficher(false)

		expect(screen.queryByRole("link", { name: /Modifier/ })).not.toBeInTheDocument()
	})

	it("affiche une liste vide", async () => {
		listerSimule.mockResolvedValue({ contenu: [], page: 1, taille: 20, total: 0, pages: 0 })

		await afficher(true)

		expect(screen.getByText("Aucun projet.")).toBeInTheDocument()
	})

	it("affiche l'erreur de l'API avec sa référence", async () => {
		listerSimule.mockRejectedValue(new ApiError(503, "Service indisponible", "id-503"))

		await afficher(false)

		expect(screen.getByText("Service indisponible")).toBeInTheDocument()
		expect(screen.getByText("id-503")).toBeInTheDocument()
	})
})
