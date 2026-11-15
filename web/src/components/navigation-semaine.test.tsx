import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { lireSemaine } from "@/lib/saisies/semaine"

import { NavigationSemaine } from "./navigation-semaine"

const semaine = lireSemaine("2026-11-09", "2026-11-09")

describe("NavigationSemaine", () => {
	it("propose les semaines voisines, la semaine en cours et le choix d'une date", () => {
		render(<NavigationSemaine semaine={semaine} dateDuJour="2026-11-20" />)

		expect(
			screen.getByRole("heading", {
				name: /Semaine du lundi 9 novembre 2026 au dimanche 15 novembre 2026/,
			}),
		).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /Semaine précédente/ })).toHaveAttribute(
			"href",
			"/saisies?semaine=2026-11-02",
		)
		expect(screen.getByRole("link", { name: /Semaine suivante/ })).toHaveAttribute(
			"href",
			"/saisies?semaine=2026-11-16",
		)
		expect(screen.getByRole("link", { name: "Cette semaine" })).not.toHaveAttribute("aria-current")
		expect(screen.getByLabelText("Aller à la semaine du")).toHaveValue("2026-11-09")
	})

	it("signale la semaine en cours", () => {
		render(<NavigationSemaine semaine={semaine} dateDuJour="2026-11-12" />)

		expect(screen.getByRole("link", { name: "Cette semaine" })).toHaveAttribute("aria-current", "date")
	})
})
