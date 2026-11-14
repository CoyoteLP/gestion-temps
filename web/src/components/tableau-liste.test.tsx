import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TableCell, TableRow } from "@/components/ui/table"
import { LISTE_PROJETS } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"

import { TableauListe } from "./tableau-liste"

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }))

const pageDe = (contenu: string[], pages = 1) => ({ contenu, page: 1, pages, total: contenu.length })

function afficher(parametres: ParametresUrl, contenu = ["Application"], pages = 1) {
	render(
		<TableauListe
			definition={LISTE_PROJETS}
			etat={lireEtatListe(LISTE_PROJETS, parametres)}
			chemin="/projets"
			parametres={parametres}
			page={pageDe(contenu, pages)}
			libelles={{ un: "projet", plusieurs: "projets" }}
			messages={{ vide: "Aucun projet.", aucunResultat: "Aucun projet ne correspond aux filtres." }}
		>
			{contenu.map((nom) => (
				<TableRow key={nom}>
					<TableCell>{nom}</TableCell>
				</TableRow>
			))}
		</TableauListe>,
	)
}

const enTete = (nom: string) =>
	screen
		.getAllByRole("columnheader")
		.find((cellule) => within(cellule).queryByRole("link", { name: new RegExp(`^${nom}`) }))

describe("TableauListe", () => {
	it("propose de trier chaque colonne triable par ordre croissant, en gardant les filtres", () => {
		afficher({ nom: "app", page: "2" })

		expect(screen.getByRole("link", { name: /^Code, trier par ordre croissant/ })).toHaveAttribute(
			"href",
			"/projets?nom=app&tri=code",
		)
		expect(screen.queryByRole("link", { name: /^Mon rôle/ })).not.toBeInTheDocument()
		expect(screen.getByRole("columnheader", { name: "Mon rôle" })).not.toHaveAttribute("aria-sort")
	})

	it("signale la colonne triée et propose l'ordre inverse", () => {
		afficher({ tri: "nom" })

		expect(enTete("Nom")).toHaveAttribute("aria-sort", "ascending")
		expect(
			screen.getByRole("link", { name: /^Nom, trié par ordre croissant, trier par ordre décroissant/ }),
		).toHaveAttribute("href", "/projets?tri=nom&sens=desc")
	})

	it("revient à l'ordre croissant après l'ordre décroissant", () => {
		afficher({ tri: "nom", sens: "desc" })

		expect(enTete("Nom")).toHaveAttribute("aria-sort", "descending")
		expect(screen.getByRole("link", { name: /^Nom, trié par ordre décroissant/ })).toHaveAttribute(
			"href",
			"/projets?tri=nom",
		)
	})

	it("propose d'effacer les filtres actifs en gardant le tri", () => {
		afficher({ nom: "app", actif: "actif", tri: "code" })

		expect(screen.getByRole("link", { name: /Effacer les filtres/ })).toHaveAttribute(
			"href",
			"/projets?tri=code",
		)
	})

	it("ne propose pas d'effacer sans filtre actif", () => {
		afficher({ tri: "code" })

		expect(screen.queryByRole("link", { name: /Effacer les filtres/ })).not.toBeInTheDocument()
	})

	it("distingue une liste vide d'une liste sans résultat pour les filtres", () => {
		afficher({}, [])
		expect(screen.getByText("Aucun projet.")).toBeInTheDocument()
	})

	it("signale qu'aucun élément ne correspond aux filtres", () => {
		afficher({ nom: "zz" }, [])
		expect(screen.getByText("Aucun projet ne correspond aux filtres.")).toBeInTheDocument()
	})

	it("garde le tri et les filtres dans les liens de pagination", () => {
		afficher({ nom: "app", tri: "nom" }, ["A"], 3)

		expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute(
			"href",
			"/projets?nom=app&tri=nom&page=2",
		)
	})

	it("replie la ligne de filtres sans filtre actif ; la loupe l'affiche", () => {
		afficher({ tri: "nom" })

		expect(screen.queryByRole("searchbox", { name: "Filtrer par nom" })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Afficher les filtres" }))
		expect(screen.getByRole("searchbox", { name: "Filtrer par nom" })).toBeInTheDocument()
	})

	it("ouvre la ligne de filtres quand un filtre est actif, loupe mise en évidence", () => {
		afficher({ nom: "app" })

		expect(
			screen.getByRole("button", { name: "Masquer les filtres (filtres actifs)" }),
		).toBeInTheDocument()
		expect(screen.getByRole("searchbox", { name: "Filtrer par nom" })).toBeVisible()
	})

	it("affiche une ligne de filtres adaptée au type de chaque colonne", () => {
		afficher({ nom: "app" })

		expect(screen.getByRole("searchbox", { name: "Filtrer par nom" })).toHaveValue("app")
		expect(screen.getByRole("searchbox", { name: "Filtrer par code" })).toHaveValue("")
		expect(screen.getByRole("combobox", { name: "Filtrer par statut" })).toHaveTextContent("Tous")
		expect(screen.queryByRole("searchbox", { name: "Filtrer par période" })).not.toBeInTheDocument()
	})
})
