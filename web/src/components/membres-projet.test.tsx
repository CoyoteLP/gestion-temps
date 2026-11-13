import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import type { Utilisateur } from "@/lib/api/modeles"
import { lireMembresDuProjet, type MembreAffiche } from "@/lib/membres/membres-du-projet"

import { MembresProjet } from "./membres-projet"

vi.mock("@/lib/membres/membres-du-projet", () => ({ lireMembresDuProjet: vi.fn() }))
vi.mock("@/lib/membres/actions", () => ({
	ajouterMembreAction: vi.fn(),
	modifierMembreAction: vi.fn(),
	retirerMembreAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const lireSimule = vi.mocked(lireMembresDuProjet)

const lea: Utilisateur = {
	id: 7,
	version: 0,
	email: "lea@exemple.fr",
	nom: "Martin",
	prenom: "Léa",
	actif: true,
	audit: null,
}

const membre = (utilisateur: Utilisateur | null, utilisateurId = 7): MembreAffiche => ({
	id: 5,
	version: 1,
	projetId: 3,
	utilisateurId,
	role: "MANAGER",
	audit: null,
	utilisateur,
})

beforeEach(() => {
	lireSimule.mockReset()
})

async function afficher() {
	render(await MembresProjet({ projetId: 3 }))
}

describe("MembresProjet", () => {
	it("liste les membres du projet avec leur nom, leur email et leur rôle", async () => {
		lireSimule.mockResolvedValue({ membres: [membre(lea)], candidats: [] })

		await afficher()

		expect(lireSimule).toHaveBeenCalledWith(3)
		expect(screen.getByRole("cell", { name: "Léa Martin" })).toBeInTheDocument()
		expect(screen.getByText("lea@exemple.fr")).toBeInTheDocument()
		expect(screen.getByText("Responsable")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Modifier le rôle de Léa Martin" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Retirer Léa Martin du projet" })).toBeInTheDocument()
	})

	it("signale un membre dont la fiche est désactivée", async () => {
		lireSimule.mockResolvedValue({ membres: [membre({ ...lea, actif: false })], candidats: [] })

		await afficher()

		expect(screen.getByText("Inactif")).toBeInTheDocument()
	})

	it("désigne par son numéro un membre dont la fiche a disparu", async () => {
		lireSimule.mockResolvedValue({ membres: [membre(null, 30)], candidats: [] })

		await afficher()

		expect(screen.getByRole("cell", { name: "Utilisateur n° 30" })).toBeInTheDocument()
	})

	it("affiche une liste vide, avec l'ajout toujours possible", async () => {
		lireSimule.mockResolvedValue({ membres: [], candidats: [lea] })

		await afficher()

		expect(screen.getByText("Aucun membre.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Ajouter un membre/ })).toBeInTheDocument()
	})

	it("affiche l'erreur de l'API avec sa référence", async () => {
		lireSimule.mockRejectedValue(new ApiError(503, "Service indisponible", "id-503"))

		await afficher()

		expect(screen.getByText("Impossible d'afficher les membres")).toBeInTheDocument()
		expect(screen.getByText("id-503")).toBeInTheDocument()
	})
})
