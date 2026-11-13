import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PaginationListe } from "./pagination-liste"

describe("PaginationListe", () => {
	it("affiche le total et des liens vers les pages voisines", () => {
		render(
			<PaginationListe page={{ page: 2, pages: 3, total: 50 }} chemin="/projets" libelle="projets" />,
		)

		expect(screen.getByText("50 projets — page 2 sur 3")).toBeInTheDocument()
		expect(screen.getByRole("link", { name: "Page précédente" })).toHaveAttribute(
			"href",
			"/projets?page=1",
		)
		expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute("href", "/projets?page=3")
	})

	it("conserve le filtre de la liste d'une page à l'autre", () => {
		render(
			<PaginationListe
				page={{ page: 1, pages: 2, total: 30 }}
				chemin="/utilisateurs"
				parametres={{ statut: "tous" }}
				libelle="utilisateurs"
			/>,
		)

		expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute(
			"href",
			"/utilisateurs?statut=tous&page=2",
		)
	})

	it("n'affiche aucun lien pour une seule page", () => {
		render(<PaginationListe page={{ page: 1, pages: 1, total: 1 }} chemin="/projets" libelle="projet" />)

		expect(screen.queryByRole("link")).not.toBeInTheDocument()
	})
})
