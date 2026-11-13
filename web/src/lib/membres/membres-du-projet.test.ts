import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { listerTousLesMembres } from "@/lib/api/membres"
import type { MembreProjet, Utilisateur } from "@/lib/api/modeles"
import { lireUtilisateur, listerTousLesUtilisateursActifs } from "@/lib/api/utilisateurs"

import { lireMembresDuProjet } from "./membres-du-projet"

vi.mock("@/lib/api/membres", () => ({ listerTousLesMembres: vi.fn() }))
vi.mock("@/lib/api/utilisateurs", () => ({
	listerTousLesUtilisateursActifs: vi.fn(),
	lireUtilisateur: vi.fn(),
}))

const membresSimules = vi.mocked(listerTousLesMembres)
const actifsSimules = vi.mocked(listerTousLesUtilisateursActifs)
const lireSimule = vi.mocked(lireUtilisateur)

const fiche = (id: number, actif = true): Utilisateur => ({
	id,
	version: 0,
	email: `u${id}@exemple.fr`,
	nom: `Nom${id}`,
	prenom: `Prenom${id}`,
	actif,
	audit: null,
})

const membre = (id: number, utilisateurId: number): MembreProjet => ({
	id,
	version: 0,
	projetId: 3,
	utilisateurId,
	role: "MANAGER",
	audit: null,
})

beforeEach(() => {
	membresSimules.mockReset()
	actifsSimules.mockReset()
	lireSimule.mockReset()
})

describe("lireMembresDuProjet", () => {
	it("associe chaque membre à sa fiche et propose les autres utilisateurs actifs", async () => {
		membresSimules.mockResolvedValue([membre(1, 10)])
		actifsSimules.mockResolvedValue([fiche(10), fiche(11)])

		const resultat = await lireMembresDuProjet(3)

		expect(membresSimules).toHaveBeenCalledWith(3)
		expect(resultat.membres).toEqual([{ ...membre(1, 10), utilisateur: fiche(10) }])
		expect(resultat.candidats).toEqual([fiche(11)])
		expect(lireSimule).not.toHaveBeenCalled()
	})

	it("lit à part la fiche d'un membre désactivé, qui n'est pas proposé à l'ajout", async () => {
		membresSimules.mockResolvedValue([membre(1, 20)])
		actifsSimules.mockResolvedValue([fiche(10)])
		lireSimule.mockResolvedValue(fiche(20, false))

		const resultat = await lireMembresDuProjet(3)

		expect(lireSimule).toHaveBeenCalledWith(20)
		expect(resultat.membres[0].utilisateur).toEqual(fiche(20, false))
		expect(resultat.candidats).toEqual([fiche(10)])
	})

	it("garde un membre dont la fiche a disparu, sans nom", async () => {
		membresSimules.mockResolvedValue([membre(1, 30)])
		actifsSimules.mockResolvedValue([])
		lireSimule.mockRejectedValue(new ApiError(404, "Introuvable", "id"))

		const resultat = await lireMembresDuProjet(3)

		expect(resultat.membres[0].utilisateur).toBeNull()
	})

	it("propage les autres erreurs de l'API", async () => {
		membresSimules.mockResolvedValue([membre(1, 30)])
		actifsSimules.mockResolvedValue([])
		lireSimule.mockRejectedValue(new ApiError(503, "Indisponible", "id"))

		await expect(lireMembresDuProjet(3)).rejects.toMatchObject({ statut: 503 })
	})
})
