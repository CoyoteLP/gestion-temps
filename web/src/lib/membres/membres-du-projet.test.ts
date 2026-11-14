import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { listerMembres, listerTousLesMembres } from "@/lib/api/membres"
import type { MembreProjet, Utilisateur } from "@/lib/api/modeles"
import { lireUtilisateur, listerTousLesUtilisateursActifs } from "@/lib/api/utilisateurs"
import type { EtatListe } from "@/lib/listes/etat-liste"

import { lireMembresDuProjet } from "./membres-du-projet"

vi.mock("@/lib/api/membres", () => ({ listerMembres: vi.fn(), listerTousLesMembres: vi.fn() }))
vi.mock("@/lib/api/utilisateurs", () => ({
	listerTousLesUtilisateursActifs: vi.fn(),
	lireUtilisateur: vi.fn(),
}))

const pageSimulee = vi.mocked(listerMembres)
const tousSimules = vi.mocked(listerTousLesMembres)
const actifsSimules = vi.mocked(listerTousLesUtilisateursActifs)
const lireSimule = vi.mocked(lireUtilisateur)

const etat: EtatListe = { page: 1, tri: "role", sens: "asc", filtres: { nom: "", email: "", role: "" } }

const fiche = (id: number, actif = true): Utilisateur => ({
	id,
	version: 0,
	email: `u${id}@exemple.fr`,
	nom: `Nom${id}`,
	prenom: `Prenom${id}`,
	actif,
	rattache: true,
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

const page = (contenu: MembreProjet[]) => ({ contenu, page: 1, taille: 20, total: contenu.length, pages: 1 })

beforeEach(() => {
	pageSimulee.mockReset()
	tousSimules.mockReset()
	actifsSimules.mockReset()
	lireSimule.mockReset()
})

describe("lireMembresDuProjet", () => {
	it("associe chaque membre de la page à sa fiche et lit la page demandée", async () => {
		pageSimulee.mockResolvedValue(page([membre(1, 10)]))
		tousSimules.mockResolvedValue([membre(1, 10)])
		actifsSimules.mockResolvedValue([fiche(10), fiche(11)])

		const resultat = await lireMembresDuProjet(3, etat)

		expect(pageSimulee).toHaveBeenCalledWith(3, etat)
		expect(resultat.membres.contenu).toEqual([{ ...membre(1, 10), utilisateur: fiche(10) }])
		expect(resultat.membres.total).toBe(1)
		expect(resultat.candidats).toEqual([fiche(11)])
		expect(lireSimule).not.toHaveBeenCalled()
	})

	it("écarte des candidats tous les membres, même ceux que le filtre masque", async () => {
		pageSimulee.mockResolvedValue(page([]))
		tousSimules.mockResolvedValue([membre(1, 10)])
		actifsSimules.mockResolvedValue([fiche(10), fiche(11)])

		const resultat = await lireMembresDuProjet(3, etat)

		expect(resultat.candidats).toEqual([fiche(11)])
	})

	it("lit à part la fiche d'un membre désactivé, qui n'est pas proposé à l'ajout", async () => {
		pageSimulee.mockResolvedValue(page([membre(1, 20)]))
		tousSimules.mockResolvedValue([membre(1, 20)])
		actifsSimules.mockResolvedValue([fiche(10)])
		lireSimule.mockResolvedValue(fiche(20, false))

		const resultat = await lireMembresDuProjet(3, etat)

		expect(lireSimule).toHaveBeenCalledWith(20)
		expect(resultat.membres.contenu[0].utilisateur).toEqual(fiche(20, false))
		expect(resultat.candidats).toEqual([fiche(10)])
	})

	it("garde un membre dont la fiche a disparu, sans nom", async () => {
		pageSimulee.mockResolvedValue(page([membre(1, 30)]))
		tousSimules.mockResolvedValue([membre(1, 30)])
		actifsSimules.mockResolvedValue([])
		lireSimule.mockRejectedValue(new ApiError(404, "Introuvable", "id"))

		const resultat = await lireMembresDuProjet(3, etat)

		expect(resultat.membres.contenu[0].utilisateur).toBeNull()
	})

	it("propage les autres erreurs de l'API", async () => {
		pageSimulee.mockResolvedValue(page([membre(1, 30)]))
		tousSimules.mockResolvedValue([])
		actifsSimules.mockResolvedValue([])
		lireSimule.mockRejectedValue(new ApiError(503, "Indisponible", "id"))

		await expect(lireMembresDuProjet(3, etat)).rejects.toMatchObject({ statut: 503 })
	})
})
