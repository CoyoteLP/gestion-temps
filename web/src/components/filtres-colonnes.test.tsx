import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Table, TableHeader } from "@/components/ui/table"
import { LISTE_MEMBRES, LISTE_UTILISATEURS } from "@/lib/listes/definitions"
import type { DefinitionListe, ParametresUrl } from "@/lib/listes/etat-liste"

import { AffichageFiltres, BoutonFiltres, FiltresColonnes } from "./filtres-colonnes"

const remplacer = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: remplacer }) }))

function afficher(definition: DefinitionListe, parametres: ParametresUrl, valeurs: Record<string, string>) {
	return render(
		<AffichageFiltres ouverteAuDepart>
			<Table>
				<TableHeader>
					<FiltresColonnes
						colonnes={definition.colonnes}
						prefixe={definition.prefixe}
						chemin="/projets/3"
						parametres={parametres}
						valeurs={valeurs}
					/>
				</TableHeader>
			</Table>
		</AffichageFiltres>,
	)
}

beforeEach(() => {
	vi.useFakeTimers()
	remplacer.mockReset()
})

afterEach(() => {
	vi.useRealTimers()
})

describe("FiltresColonnes", () => {
	it("applique un filtre texte après une pause de frappe, page remise à 1, autres paramètres gardés", () => {
		afficher(LISTE_MEMBRES, { libelle: "rec", "membres.page": "2" }, { nom: "", email: "", role: "" })

		fireEvent.change(screen.getByRole("searchbox", { name: "Filtrer par nom" }), {
			target: { value: "lea" },
		})
		act(() => vi.advanceTimersByTime(299))
		expect(remplacer).not.toHaveBeenCalled()

		act(() => vi.advanceTimersByTime(1))
		expect(remplacer).toHaveBeenCalledWith("/projets/3?libelle=rec&membres.nom=lea", { scroll: false })
	})

	it("n'envoie qu'une fois une saisie continue", () => {
		afficher(LISTE_MEMBRES, {}, { nom: "", email: "", role: "" })
		const champ = screen.getByRole("searchbox", { name: "Filtrer par nom" })

		fireEvent.change(champ, { target: { value: "l" } })
		act(() => vi.advanceTimersByTime(200))
		fireEvent.change(champ, { target: { value: "le" } })
		act(() => vi.advanceTimersByTime(300))

		expect(remplacer).toHaveBeenCalledTimes(1)
		expect(remplacer).toHaveBeenCalledWith("/projets/3?membres.nom=le", { scroll: false })
	})

	it("retire le filtre quand la saisie est vidée", () => {
		afficher(LISTE_MEMBRES, { "membres.nom": "lea" }, { nom: "lea", email: "", role: "" })

		fireEvent.change(screen.getByRole("searchbox", { name: "Filtrer par nom" }), {
			target: { value: "  " },
		})
		act(() => vi.advanceTimersByTime(300))

		expect(remplacer).toHaveBeenCalledWith("/projets/3", { scroll: false })
	})

	it("n'envoie rien si la saisie ne change pas le filtre", () => {
		afficher(LISTE_MEMBRES, { "membres.nom": "lea" }, { nom: "lea", email: "", role: "" })

		fireEvent.change(screen.getByRole("searchbox", { name: "Filtrer par nom" }), {
			target: { value: "lea " },
		})
		act(() => vi.advanceTimersByTime(1000))

		expect(remplacer).not.toHaveBeenCalled()
	})

	it("reprend la valeur de l'URL quand elle change d'ailleurs (effacement)", () => {
		const { rerender } = afficher(
			LISTE_MEMBRES,
			{ "membres.nom": "lea" },
			{ nom: "lea", email: "", role: "" },
		)

		rerender(
			<AffichageFiltres ouverteAuDepart>
				<Table>
					<TableHeader>
						<FiltresColonnes
							colonnes={LISTE_MEMBRES.colonnes}
							prefixe={LISTE_MEMBRES.prefixe}
							chemin="/projets/3"
							parametres={{}}
							valeurs={{ nom: "", email: "", role: "" }}
						/>
					</TableHeader>
				</Table>
			</AffichageFiltres>,
		)

		expect(screen.getByRole("searchbox", { name: "Filtrer par nom" })).toHaveValue("")
		act(() => vi.advanceTimersByTime(1000))
		expect(remplacer).not.toHaveBeenCalled()
	})

	it("affiche le choix courant d'un filtre à choix, ou sa valeur par défaut", () => {
		afficher(LISTE_UTILISATEURS, {}, { nom: "", email: "", actif: "inactif" })

		expect(screen.getByRole("combobox", { name: "Filtrer par statut" })).toHaveTextContent("En attente")
	})

	it("limite la saisie d'un filtre texte à la longueur admise par l'API", () => {
		afficher(LISTE_MEMBRES, {}, { nom: "", email: "", role: "" })

		expect(screen.getByRole("searchbox", { name: "Filtrer par email" })).toHaveAttribute(
			"maxLength",
			"100",
		)
	})
})

describe("BoutonFiltres", () => {
	function afficherAvecBouton(ouverteAuDepart: boolean, actifs: boolean) {
		render(
			<AffichageFiltres ouverteAuDepart={ouverteAuDepart}>
				<Table>
					<TableHeader>
						<tr>
							<th>
								<BoutonFiltres actifs={actifs} />
							</th>
						</tr>
						<FiltresColonnes
							colonnes={LISTE_MEMBRES.colonnes}
							prefixe={LISTE_MEMBRES.prefixe}
							chemin="/projets/3"
							parametres={{}}
							valeurs={{ nom: "", email: "", role: "" }}
						/>
					</TableHeader>
				</Table>
			</AffichageFiltres>,
		)
	}

	it("masque la ligne de filtres par défaut et l'affiche au clic", () => {
		afficherAvecBouton(false, false)
		const bouton = screen.getByRole("button", { name: "Afficher les filtres" })

		expect(bouton).toHaveAttribute("aria-expanded", "false")
		expect(screen.queryByRole("searchbox", { name: "Filtrer par nom" })).not.toBeInTheDocument()

		fireEvent.click(bouton)

		expect(screen.getByRole("button", { name: "Masquer les filtres" })).toHaveAttribute(
			"aria-expanded",
			"true",
		)
		expect(screen.getByRole("searchbox", { name: "Filtrer par nom" })).toBeInTheDocument()
	})

	it("relie le bouton à la ligne qu'il commande", () => {
		afficherAvecBouton(true, false)

		const id = screen.getByRole("button", { name: "Masquer les filtres" }).getAttribute("aria-controls")
		expect(document.getElementById(id ?? "")).toContainElement(
			screen.getByRole("searchbox", { name: "Filtrer par nom" }),
		)
	})

	it("signale des filtres actifs", () => {
		afficherAvecBouton(true, true)

		expect(
			screen.getByRole("button", { name: "Masquer les filtres (filtres actifs)" }),
		).toBeInTheDocument()
	})
})
