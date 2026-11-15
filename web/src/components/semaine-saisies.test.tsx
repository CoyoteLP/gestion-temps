import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { Projet, Saisie, Tache, Utilisateur } from "@/lib/api/modeles"
import { type DonneesSemaine, lireDonneesSemaine } from "@/lib/saisies/donnees"
import { lireSemaine } from "@/lib/saisies/semaine"

import { SemaineSaisies } from "./semaine-saisies"

vi.mock("@/lib/saisies/donnees", () => ({ lireDonneesSemaine: vi.fn() }))
vi.mock("@/lib/saisies/actions", () => ({
	creerSaisieAction: vi.fn(),
	modifierSaisieAction: vi.fn(),
	supprimerSaisieAction: vi.fn(),
	preremplirSemaineAction: vi.fn(),
	recopierLundiAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const lireSimule = vi.mocked(lireDonneesSemaine)
const semaine = lireSemaine("2026-11-09", "2026-11-09")

const projet = (monRole: Projet["monRole"], actif = true): Projet => ({
	id: 3,
	version: 0,
	code: "PJT001",
	nom: "Projet",
	description: null,
	dateDebut: null,
	dateFin: null,
	actif,
	monRole,
	audit: null,
})
const tache: Tache = {
	id: 8,
	version: 0,
	projetId: 3,
	libelle: "Dev",
	description: null,
	actif: true,
	audit: null,
}
const saisie = (jour: string): Saisie => ({
	id: Number(jour.slice(-2)),
	version: 0,
	utilisateurId: 7,
	tacheId: 8,
	jour,
	duree: 7,
	commentaire: null,
	audit: null,
})

const donnees = (autres: Partial<DonneesSemaine>): DonneesSemaine => ({
	moi: { id: 7 } as Utilisateur,
	saisies: [],
	projets: [projet("CONTRIBUTEUR")],
	taches: [tache],
	clotures: [],
	saisiesPrecedentes: [],
	...autres,
})

async function afficher() {
	render(await SemaineSaisies({ semaine, dateDuJour: "2026-11-10" }))
}

beforeEach(() => {
	lireSimule.mockReset()
})

describe("SemaineSaisies", () => {
	it("affiche la grille et la liste de la semaine, avec l'ajout d'une saisie", async () => {
		lireSimule.mockResolvedValue(donnees({ saisies: [saisie("2026-11-09")] }))

		await afficher()

		expect(lireSimule).toHaveBeenCalledWith(semaine)
		expect(screen.getByRole("button", { name: /Nouvelle saisie/ })).toBeInTheDocument()
		expect(screen.getAllByText("PJT001 · Dev").length).toBeGreaterThan(0)
	})

	it("propose de préremplir une semaine vide quand la précédente a des saisies", async () => {
		lireSimule.mockResolvedValue(donnees({ saisiesPrecedentes: [saisie("2026-11-02")] }))

		await afficher()

		expect(
			screen.getByRole("button", { name: /Préremplir depuis la semaine précédente/ }),
		).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /Recopier le lundi/ })).not.toBeInTheDocument()
	})

	it("propose de recopier le lundi, mais plus de préremplir, quand le lundi est saisi", async () => {
		lireSimule.mockResolvedValue(donnees({ saisies: [saisie("2026-11-09")] }))

		await afficher()

		expect(screen.getByRole("button", { name: /Recopier le lundi sur la semaine/ })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /Préremplir/ })).not.toBeInTheDocument()
	})

	it("explique l'absence de saisie possible pour un membre d'aucun projet actif", async () => {
		lireSimule.mockResolvedValue(donnees({ projets: [projet(null), projet("MANAGER", false)] }))

		await afficher()

		expect(screen.getByText("Aucun projet ouvert à la saisie")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /Nouvelle saisie/ })).not.toBeInTheDocument()
	})

	it("explique qu'un administrateur sans fiche ne saisit pas", async () => {
		lireSimule.mockResolvedValue(donnees({ moi: null }))

		await afficher()

		expect(screen.getByText("Saisie des temps indisponible")).toBeInTheDocument()
	})

	it("affiche l'erreur de l'API avec sa référence", async () => {
		lireSimule.mockRejectedValue(new ApiError(503, "Service indisponible", "id-503"))

		await afficher()

		expect(screen.getByText("Service indisponible")).toBeInTheDocument()
		expect(screen.getByText("id-503")).toBeInTheDocument()
	})
})
