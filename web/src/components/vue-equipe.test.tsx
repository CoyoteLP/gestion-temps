import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { MembreProjet, Projet, Saisie, Tache } from "@/lib/api/modeles"
import { type DonneesEquipe, lireDonneesEquipe } from "@/lib/equipe/donnees"
import { lireMois } from "@/lib/equipe/mois"

import { VueEquipe } from "./vue-equipe"

vi.mock("@/lib/equipe/donnees", () => ({ lireDonneesEquipe: vi.fn() }))
vi.mock("@/lib/clotures/actions", () => ({
	cloturerMoisAction: vi.fn(),
	cloturerTousLesProjetsAction: vi.fn(),
	rouvrirMoisAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const lireSimule = vi.mocked(lireDonneesEquipe)
const mois = lireMois("2026-10", "2026-11-15")

const projet: Projet = {
	id: 3,
	version: 0,
	code: "PJT001",
	nom: "Projet",
	description: null,
	dateDebut: null,
	dateFin: null,
	actif: true,
	monRole: "MANAGER",
	audit: null,
}
const membre: MembreProjet = {
	id: 50,
	version: 0,
	projetId: 3,
	utilisateurId: 5,
	nom: "Dupont",
	prenom: "Jean",
	role: "MANAGER",
	audit: null,
}
const tache: Tache = {
	id: 8,
	version: 0,
	projetId: 3,
	libelle: "Dev",
	description: null,
	actif: true,
	audit: null,
}
const saisie = (id: number, utilisateurId: number): Saisie => ({
	id,
	version: 0,
	utilisateurId,
	tacheId: 8,
	jour: "2026-10-05",
	duree: 7,
	commentaire: "Revue",
	audit: null,
})

const donnees = (autres: Partial<DonneesEquipe> = {}): DonneesEquipe => {
	const saisies = [saisie(1, 5), saisie(2, 12)]
	return {
		synthese: null,
		projets: [projet],
		projet,
		membres: [membre],
		taches: [tache],
		saisies,
		detail: { contenu: saisies, page: 1, taille: 20, total: 2, pages: 1 },
		membreFiltre: null,
		tacheFiltre: null,
		cloture: null,
		...autres,
	}
}

async function afficher(parametres = {}, estAdmin = false) {
	render(await VueEquipe({ mois, dateDuJour: "2026-11-15", parametres, estAdmin }))
}

beforeEach(() => {
	lireSimule.mockReset()
})

describe("VueEquipe", () => {
	it("affiche le projet, le mois, son statut, le récapitulatif et le détail", async () => {
		lireSimule.mockResolvedValue(donnees())

		await afficher()

		expect(screen.getByRole("combobox", { name: "Projet" })).toHaveTextContent("PJT001 · Projet")
		expect(screen.getByRole("heading", { name: "octobre 2026" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Clôturer ce mois" })).toBeInTheDocument()
		expect(screen.getAllByRole("row", { name: /Total du projet 14 h/ })).toHaveLength(2)
		const detail = screen.getByRole("region", { name: "Détail des saisies" })
		expect(within(detail).getByRole("row", { name: /Jean Dupont/ })).toHaveTextContent("Dev")
		expect(within(detail).getByRole("row", { name: /Ancien membre \(n° 12\)/ })).toBeInTheDocument()
	})

	it("filtre le détail par membre, anciens membres compris", async () => {
		lireSimule.mockResolvedValue(donnees({ membreFiltre: 12 }))

		await afficher({ projet: "3", mois: "2026-10", "saisies.utilisateurId": "12" })

		expect(screen.getByRole("combobox", { name: "Filtrer par membre" })).toHaveTextContent(
			"Ancien membre (n° 12)",
		)
		// L'effacement du filtre garde le projet et le mois
		expect(screen.getByRole("link", { name: /Effacer les filtres/ })).toHaveAttribute(
			"href",
			"/equipe?projet=3&mois=2026-10",
		)
	})

	it("garde dans le filtre un membre demandé dans l'URL sans saisie dans le projet", async () => {
		lireSimule.mockResolvedValue(
			donnees({ membreFiltre: 40, detail: { contenu: [], page: 1, taille: 20, total: 0, pages: 0 } }),
		)

		await afficher({ projet: "3", mois: "2026-10", "saisies.utilisateurId": "40" })

		expect(screen.getByRole("combobox", { name: "Filtrer par membre" })).toHaveTextContent(
			"Utilisateur n° 40",
		)
		expect(screen.getByText("Aucune saisie de ce membre ce mois-ci.")).toBeInTheDocument()
	})

	it("montre la synthèse des projets du mois à l'administrateur, avant le détail du projet", async () => {
		lireSimule.mockResolvedValue(
			donnees({
				synthese: {
					projets: {
						contenu: [
							{
								projetId: 3,
								code: "PJT001",
								nom: "Projet",
								actif: true,
								totalHeures: 14,
								clotureId: null,
							},
						],
						page: 1,
						taille: 20,
						total: 1,
						pages: 1,
					},
					totalHeures: 14,
				},
			}),
		)

		await afficher({}, true)

		const synthese = screen.getByRole("region", { name: "Synthèse des projets" })
		expect(within(synthese).getByRole("row", { name: /PJT001 · Projet/ })).toHaveTextContent("14 h")
		expect(
			within(synthese).getByRole("button", { name: "Clôturer tous les projets ouverts" }),
		).toBeInTheDocument()
	})

	it("ne montre pas la synthèse à un responsable", async () => {
		lireSimule.mockResolvedValue(donnees())

		await afficher()

		expect(screen.queryByRole("region", { name: "Synthèse des projets" })).not.toBeInTheDocument()
	})

	it("filtre le détail par tâche", async () => {
		lireSimule.mockResolvedValue(donnees({ tacheFiltre: 8 }))

		await afficher({ projet: "3", mois: "2026-10", "saisies.tacheId": "8" })

		expect(screen.getByRole("combobox", { name: "Filtrer par tâche" })).toHaveTextContent("Dev")
	})

	it("informe un contributeur que la vue est réservée aux responsables", async () => {
		lireSimule.mockResolvedValue(donnees({ projets: [], projet: null, detail: null }))

		await afficher()

		expect(screen.getByRole("alert")).toHaveTextContent("Aucun projet à suivre")
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
	})

	it("affiche le refus de l'API", async () => {
		lireSimule.mockRejectedValue(new ApiError(403, "Vous n'êtes pas responsable de ce projet", "id-403"))

		await afficher()

		expect(screen.getByText("Vous n'êtes pas responsable de ce projet")).toBeInTheDocument()
	})
})
