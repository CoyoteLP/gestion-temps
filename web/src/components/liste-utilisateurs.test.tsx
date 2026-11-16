import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { Utilisateur } from "@/lib/api/modeles"
import { listerUtilisateurs } from "@/lib/api/utilisateurs"

import { ListeUtilisateurs } from "./liste-utilisateurs"

vi.mock("@/lib/api/utilisateurs", () => ({ listerUtilisateurs: vi.fn() }))
vi.mock("@/lib/utilisateurs/actions", () => ({
	changerActivationAction: vi.fn(),
	reinitialiserRattachementAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const listerSimule = vi.mocked(listerUtilisateurs)

const fiche = (actif: boolean): Utilisateur => ({
	id: 7,
	version: 2,
	email: "lea@exemple.fr",
	nom: "Martin",
	prenom: "Léa",
	actif,
	rattache: true,
	audit: { creeLe: "2026-11-12T09:30:00Z", creePar: "lea", modifieLe: null, modifiePar: null },
})

const page = (contenu: Utilisateur[]) => ({ contenu, page: 1, taille: 20, total: contenu.length, pages: 1 })

beforeEach(() => {
	listerSimule.mockReset()
})

describe("ListeUtilisateurs", () => {
	it("affiche par défaut les comptes en attente, à la page demandée", async () => {
		listerSimule.mockResolvedValue(page([fiche(false)]))

		render(await ListeUtilisateurs({ parametres: { page: "2" } }))

		expect(listerSimule).toHaveBeenCalledWith({
			page: 2,
			tri: null,
			sens: "asc",
			filtres: { nom: "", email: "", actif: "inactif" },
		})
		expect(screen.getByRole("cell", { name: "Léa Martin" })).toBeInTheDocument()
		expect(screen.getByText("12/11/2026")).toBeInTheDocument()
		// Valeur par défaut : pas un filtre actif, la ligne de filtres est repliée
		fireEvent.click(screen.getByRole("button", { name: "Afficher les filtres" }))
		expect(screen.getByRole("combobox", { name: "Filtrer par statut" })).toHaveTextContent("En attente")
	})

	it("transmet le tri et les filtres lus dans l'URL", async () => {
		listerSimule.mockResolvedValue(page([]))

		render(
			await ListeUtilisateurs({
				parametres: { tri: "email", sens: "desc", nom: "lea", actif: "tous" },
			}),
		)

		expect(listerSimule).toHaveBeenCalledWith({
			page: 1,
			tri: "email",
			sens: "desc",
			filtres: { nom: "lea", email: "", actif: "tous" },
		})
	})

	it("propose d'activer un compte inactif, sans le désactiver", async () => {
		listerSimule.mockResolvedValue(page([fiche(false)]))

		render(await ListeUtilisateurs({ parametres: {} }))

		expect(screen.getByRole("button", { name: /Activer/ })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /Désactiver/ })).not.toBeInTheDocument()
	})

	it("propose de désactiver un compte actif, sans l'activer", async () => {
		listerSimule.mockResolvedValue(page([fiche(true)]))

		render(await ListeUtilisateurs({ parametres: { actif: "actif" } }))

		expect(screen.getByRole("button", { name: /Désactiver/ })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /^Activer/ })).not.toBeInTheDocument()
	})

	it("propose de réinitialiser le rattachement d'une fiche rattachée seulement", async () => {
		listerSimule.mockResolvedValue(
			page([fiche(true), { ...fiche(true), id: 8, email: "x@exemple.fr", rattache: false }]),
		)

		render(await ListeUtilisateurs({ parametres: { actif: "tous" } }))

		expect(screen.getAllByRole("button", { name: /Réinitialiser le rattachement/ })).toHaveLength(1)
	})

	it.each([
		[{}, "Aucun compte en attente."],
		[{ actif: "tous" }, "Aucun utilisateur ne correspond aux filtres."],
		[{ nom: "zz" }, "Aucun utilisateur ne correspond aux filtres."],
	])("affiche le message d'une liste vide (%o)", async (parametres, message) => {
		listerSimule.mockResolvedValue(page([]))

		render(await ListeUtilisateurs({ parametres }))

		expect(screen.getByText(message)).toBeInTheDocument()
	})

	it("affiche l'erreur de l'API avec sa référence", async () => {
		listerSimule.mockRejectedValue(new ApiError(403, "Accès refusé", "id-403"))

		render(await ListeUtilisateurs({ parametres: {} }))

		expect(screen.getByText("Accès refusé")).toBeInTheDocument()
		expect(screen.getByText("id-403")).toBeInTheDocument()
	})
})
