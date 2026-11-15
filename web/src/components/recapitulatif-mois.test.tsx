import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RecapitulatifMois } from "./recapitulatif-mois"

describe("RecapitulatifMois", () => {
	it("affiche le total par membre, par tâche et du projet", () => {
		render(
			<RecapitulatifMois
				recapitulatif={{
					parMembre: [
						{ utilisateurId: 5, nom: "Jean Dupont", role: "MANAGER", total: 9 },
						{ utilisateurId: 7, nom: "Paul Martin", role: "CONTRIBUTEUR", total: 0 },
						{ utilisateurId: 12, nom: "Ancien membre (n° 12)", role: null, total: 3 },
					],
					parTache: [{ tacheId: 8, libelle: "Dev", total: 12 }],
					total: 12,
				}}
			/>,
		)

		const ligne = (nom: RegExp) =>
			within(screen.getByRole("row", { name: nom }))
				.getAllByRole("cell")
				.map((cellule) => cellule.textContent)
		expect(ligne(/Jean Dupont/)).toEqual(["Jean Dupont", "Responsable", "9 h"])
		expect(ligne(/Paul Martin/)).toEqual(["Paul Martin", "Contributeur", "0 h"])
		expect(ligne(/Ancien membre/)).toEqual(["Ancien membre (n° 12)", "Plus membre", "3 h"])
		expect(ligne(/Dev/)).toEqual(["Dev", "12 h"])
		expect(screen.getAllByRole("row", { name: /Total du projet/ })).toHaveLength(2)
	})

	it("signale un mois sans saisie", () => {
		render(<RecapitulatifMois recapitulatif={{ parMembre: [], parTache: [], total: 0 }} />)

		expect(screen.getByText("Aucun membre.")).toBeInTheDocument()
		expect(screen.getByText("Aucune saisie ce mois-ci.")).toBeInTheDocument()
	})
})
