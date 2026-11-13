import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DialogueTache } from "@/components/dialogue-tache"
import { ApiError } from "@/lib/api/erreurs"
import type { Tache } from "@/lib/api/modeles"
import { listerTaches } from "@/lib/api/taches"

import { TachesProjet } from "./taches-projet"

vi.mock("@/lib/api/taches", () => ({ listerTaches: vi.fn() }))
vi.mock("@/lib/taches/actions", () => ({
	creerTacheAction: vi.fn(),
	modifierTacheAction: vi.fn(),
	supprimerTacheAction: vi.fn(),
}))
// Doublure : affiche le bouton d'ouverture et garde les propriétés reçues
vi.mock("@/components/dialogue-tache", () => ({
	DialogueTache: vi.fn(({ declencheur }: { declencheur: ReactNode }) => declencheur),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const listerSimule = vi.mocked(listerTaches)

const tache: Tache = {
	id: 8,
	version: 0,
	projetId: 3,
	libelle: "Recette",
	description: "Tests de validation",
	actif: false,
	audit: null,
}

beforeEach(() => {
	listerSimule.mockReset()
	vi.mocked(DialogueTache).mockClear()
	listerSimule.mockResolvedValue({ contenu: [tache], page: 1, taille: 20, total: 1, pages: 1 })
})

async function afficher(estAdmin: boolean) {
	render(await TachesProjet({ projetId: 3, page: 2, estAdmin }))
}

describe("TachesProjet", () => {
	it("liste les tâches du projet à la page demandée", async () => {
		await afficher(false)

		expect(listerSimule).toHaveBeenCalledWith(3, 2)
		expect(screen.getByRole("cell", { name: "Recette" })).toBeInTheDocument()
		expect(screen.getByText("Inactive")).toBeInTheDocument()
	})

	it("donne à l'administrateur la création, la modification et la suppression", async () => {
		await afficher(true)

		expect(screen.getByRole("button", { name: /Nouvelle tâche/ })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Modifier la tâche Recette" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Supprimer la tâche Recette" })).toBeInTheDocument()
	})

	it("ne transmet au dialogue de modification que les champs modifiables, sans l'audit", async () => {
		listerSimule.mockResolvedValue({
			contenu: [
				{ ...tache, audit: { creeLe: "", creePar: "admin", modifieLe: null, modifiePar: null } },
			],
			page: 1,
			taille: 20,
			total: 1,
			pages: 1,
		})

		await afficher(true)

		expect(vi.mocked(DialogueTache)).toHaveBeenCalledWith(
			expect.objectContaining({
				tache: {
					id: 8,
					version: 0,
					libelle: "Recette",
					description: "Tests de validation",
					actif: false,
				},
			}),
			undefined,
		)
	})

	it("affiche la description complète au survol d'une description tronquée", async () => {
		await afficher(false)

		expect(screen.getByRole("cell", { name: "Tests de validation" })).toHaveAttribute(
			"title",
			"Tests de validation",
		)
	})

	it("ne les propose pas aux autres utilisateurs", async () => {
		await afficher(false)

		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})

	it("affiche une liste vide", async () => {
		listerSimule.mockResolvedValue({ contenu: [], page: 1, taille: 20, total: 0, pages: 0 })

		await afficher(false)

		expect(screen.getByText("Aucune tâche.")).toBeInTheDocument()
	})

	it("affiche l'erreur de l'API avec sa référence", async () => {
		listerSimule.mockRejectedValue(new ApiError(503, "Service indisponible", "id-503"))

		await afficher(false)

		expect(screen.getByText("Service indisponible")).toBeInTheDocument()
		expect(screen.getByText("id-503")).toBeInTheDocument()
	})
})
