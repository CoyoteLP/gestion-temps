import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Cloture, Projet } from "@/lib/api/modeles"

import { StatutMois } from "./statut-mois"

vi.mock("@/lib/clotures/actions", () => ({
	cloturerMoisAction: vi.fn(),
	rouvrirMoisAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const projet = (monRole: Projet["monRole"]) => ({ id: 3, code: "PJT001", monRole })
const cloture: Cloture = { id: 4, version: 0, projetId: 3, mois: "2026-10", audit: null }

function afficher(props: {
	monRole?: Projet["monRole"]
	mois?: string
	cloture?: Cloture | null
	estAdmin?: boolean
}) {
	render(
		<StatutMois
			projet={projet(props.monRole ?? "MANAGER")}
			mois={props.mois ?? "2026-10"}
			cloture={props.cloture ?? null}
			dateDuJour="2026-11-15"
			estAdmin={props.estAdmin ?? false}
		/>,
	)
}

describe("StatutMois", () => {
	it.each(["MANAGER", "BACKUP"] as const)("propose à un %s de clôturer un mois terminé", (monRole) => {
		afficher({ monRole })

		expect(screen.getByText("Ouvert")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Clôturer ce mois" })).toBeInTheDocument()
	})

	it("ne propose pas de clôturer le mois en cours", () => {
		afficher({ mois: "2026-11" })

		expect(screen.queryByRole("button", { name: "Clôturer ce mois" })).not.toBeInTheDocument()
	})

	it("ne propose rien à un contributeur", () => {
		afficher({ monRole: "CONTRIBUTEUR" })

		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})

	it("propose de rouvrir un mois clôturé à l'administrateur seulement", () => {
		afficher({ cloture, estAdmin: true })
		expect(screen.getByText("Clôturé")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Rouvrir" })).toBeInTheDocument()
	})

	it("ne propose pas de rouvrir à un responsable", () => {
		afficher({ cloture })

		expect(screen.getByText("Clôturé")).toBeInTheDocument()
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})
})
