import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { Utilisateur } from "@/lib/api/modeles"
import { listerUtilisateurs } from "@/lib/api/utilisateurs"
import { FILTRES_UTILISATEURS } from "@/lib/utilisateurs/filtre"

import { ListeUtilisateurs } from "./liste-utilisateurs"

vi.mock("@/lib/api/utilisateurs", () => ({ listerUtilisateurs: vi.fn() }))
vi.mock("@/lib/utilisateurs/actions", () => ({ changerActivationAction: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

const listerSimule = vi.mocked(listerUtilisateurs)
const [EN_ATTENTE, ACTIFS, TOUS] = FILTRES_UTILISATEURS

const fiche = (actif: boolean): Utilisateur => ({
	id: 7,
	version: 2,
	email: "lea@exemple.fr",
	nom: "Martin",
	prenom: "Léa",
	actif,
	audit: { creeLe: "2026-11-12T09:30:00Z", creePar: "lea", modifieLe: null, modifiePar: null },
})

const page = (contenu: Utilisateur[]) => ({ contenu, page: 1, taille: 20, total: contenu.length, pages: 1 })

beforeEach(() => {
	listerSimule.mockReset()
})

describe("ListeUtilisateurs", () => {
	it("liste les comptes du filtre demandé, à la page demandée", async () => {
		listerSimule.mockResolvedValue(page([fiche(false)]))

		render(await ListeUtilisateurs({ filtre: EN_ATTENTE, page: 2 }))

		expect(listerSimule).toHaveBeenCalledWith(false, 2)
		expect(screen.getByRole("cell", { name: "Léa Martin" })).toBeInTheDocument()
		expect(screen.getByText("12/11/2026")).toBeInTheDocument()
	})

	it("propose d'activer un compte inactif, sans le désactiver", async () => {
		listerSimule.mockResolvedValue(page([fiche(false)]))

		render(await ListeUtilisateurs({ filtre: EN_ATTENTE, page: 1 }))

		expect(screen.getByRole("button", { name: /Activer/ })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /Désactiver/ })).not.toBeInTheDocument()
	})

	it("propose de désactiver un compte actif, sans l'activer", async () => {
		listerSimule.mockResolvedValue(page([fiche(true)]))

		render(await ListeUtilisateurs({ filtre: ACTIFS, page: 1 }))

		expect(screen.getByRole("button", { name: /Désactiver/ })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /^Activer/ })).not.toBeInTheDocument()
	})

	it("signale le filtre courant et garde le filtre des autres liens", async () => {
		listerSimule.mockResolvedValue(page([]))

		render(await ListeUtilisateurs({ filtre: TOUS, page: 1 }))

		expect(listerSimule).toHaveBeenCalledWith(undefined, 1)
		expect(screen.getByRole("link", { name: "Tous" })).toHaveAttribute("aria-current", "page")
		expect(screen.getByRole("link", { name: "En attente" })).toHaveAttribute(
			"href",
			"/utilisateurs?statut=en-attente",
		)
		expect(screen.getByRole("link", { name: "En attente" })).not.toHaveAttribute("aria-current")
	})

	it.each([
		[EN_ATTENTE, "Aucun compte en attente."],
		[TOUS, "Aucun utilisateur."],
	])("affiche une liste vide (%s)", async (filtre, message) => {
		listerSimule.mockResolvedValue(page([]))

		render(await ListeUtilisateurs({ filtre, page: 1 }))

		expect(screen.getByText(message)).toBeInTheDocument()
	})

	it("affiche l'erreur de l'API avec sa référence", async () => {
		listerSimule.mockRejectedValue(new ApiError(403, "Accès refusé", "id-403"))

		render(await ListeUtilisateurs({ filtre: EN_ATTENTE, page: 1 }))

		expect(screen.getByText("Accès refusé")).toBeInTheDocument()
		expect(screen.getByText("id-403")).toBeInTheDocument()
	})
})
