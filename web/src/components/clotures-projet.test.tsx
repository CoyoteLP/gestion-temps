import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { listerCloturesDuProjet } from "@/lib/api/clotures"
import { ApiError } from "@/lib/api/erreurs"
import type { Cloture, Projet } from "@/lib/api/modeles"

import { CloturesProjet } from "./clotures-projet"

vi.mock("@/lib/api/clotures", () => ({ listerCloturesDuProjet: vi.fn() }))
vi.mock("@/lib/clotures/actions", () => ({
	cloturerMoisAction: vi.fn(),
	rouvrirMoisAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const listerSimule = vi.mocked(listerCloturesDuProjet)

const cloture: Cloture = {
	id: 4,
	version: 0,
	projetId: 3,
	mois: "2026-10",
	audit: {
		creeLe: "2026-11-02T09:00:00Z",
		creePar: "admin",
		modifieLe: "2026-11-02T09:00:00Z",
		modifiePar: "admin",
	},
}

async function afficher(monRole: Projet["monRole"], estAdmin = false) {
	render(
		await CloturesProjet({
			projet: { id: 3, code: "PJT001", monRole },
			estAdmin,
			parametres: { "clotures.page": "2" },
		}),
	)
}

beforeEach(() => {
	listerSimule.mockReset()
	listerSimule.mockResolvedValue({ contenu: [cloture], page: 2, taille: 20, total: 21, pages: 2 })
})

describe("CloturesProjet", () => {
	it("liste les mois clôturés du projet à la page demandée, sans la date de clôture", async () => {
		await afficher("CONTRIBUTEUR")

		expect(listerSimule).toHaveBeenCalledWith(3, 2)
		expect(screen.getByRole("row", { name: /octobre 2026/ })).toBeInTheDocument()
		expect(screen.queryByRole("columnheader", { name: "Clôturé le" })).not.toBeInTheDocument()
	})

	it("montre à l'administrateur la date et l'auteur de la clôture", async () => {
		await afficher(null, true)

		expect(screen.getByRole("columnheader", { name: "Clôturé le" })).toBeInTheDocument()
		expect(screen.getByRole("row", { name: /octobre 2026/ })).toHaveTextContent("02/11/2026 par admin")
	})

	it.each(["MANAGER", "BACKUP"] as const)(
		"propose à un %s de clôturer un mois, pas de rouvrir",
		async (role) => {
			await afficher(role)

			expect(screen.getByRole("button", { name: "Clôturer un mois" })).toBeInTheDocument()
			expect(screen.queryByRole("button", { name: /Rouvrir/ })).not.toBeInTheDocument()
		},
	)

	it("ne propose rien à un contributeur", async () => {
		await afficher("CONTRIBUTEUR")

		expect(screen.queryByRole("button", { name: "Clôturer un mois" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /Rouvrir/ })).not.toBeInTheDocument()
	})

	it("propose à l'administrateur de clôturer et de rouvrir", async () => {
		await afficher(null, true)

		expect(screen.getByRole("button", { name: "Clôturer un mois" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Rouvrir octobre 2026" })).toBeInTheDocument()
	})

	it("affiche le refus de l'API", async () => {
		listerSimule.mockRejectedValue(new ApiError(403, "Vous n'êtes pas membre de ce projet", "id"))

		await afficher("CONTRIBUTEUR")

		expect(screen.getByText("Vous n'êtes pas membre de ce projet")).toBeInTheDocument()
	})
})
