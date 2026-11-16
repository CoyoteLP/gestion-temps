import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { lireMois } from "@/lib/equipe/mois"

import { NavigationMois } from "./navigation-mois"

describe("NavigationMois", () => {
	it("titre le mois et mène aux mois voisins du même projet", () => {
		render(
			<NavigationMois mois={lireMois("2026-10", "2026-11-15")} dateDuJour="2026-11-15" projetId={3} />,
		)

		expect(screen.getByRole("heading", { name: "octobre 2026" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /Mois précédent/ })).toHaveAttribute(
			"href",
			"/equipe?projet=3&mois=2026-09",
		)
		expect(screen.getByRole("link", { name: /Mois suivant/ })).toHaveAttribute(
			"href",
			"/equipe?projet=3&mois=2026-11",
		)
		expect(screen.getByRole("link", { name: "Ce mois-ci" })).toHaveAttribute("href", "/equipe?projet=3")
		expect(screen.getByRole("link", { name: "Ce mois-ci" })).not.toHaveAttribute("aria-current")
	})

	it("signale le mois en cours", () => {
		render(
			<NavigationMois mois={lireMois("2026-11", "2026-11-15")} dateDuJour="2026-11-15" projetId={3} />,
		)

		expect(screen.getByRole("link", { name: "Ce mois-ci" })).toHaveAttribute("aria-current", "date")
	})
})
