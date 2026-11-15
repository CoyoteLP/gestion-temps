import { describe, expect, it } from "vitest"

import type { MembreProjet, Projet, Saisie } from "@/lib/api/modeles"

import { calculerRecapitulatif, estResponsable, projetsPourEquipe } from "./recapitulatif"

const projet = (id: number, code: string, monRole: Projet["monRole"]): Projet => ({
	id,
	version: 0,
	code,
	nom: `Projet ${code}`,
	description: null,
	dateDebut: null,
	dateFin: null,
	actif: true,
	monRole,
	audit: null,
})

const membre = (
	utilisateurId: number,
	prenom: string,
	nom: string,
	role: MembreProjet["role"],
): MembreProjet => ({
	id: utilisateurId * 10,
	version: 0,
	projetId: 3,
	utilisateurId,
	nom,
	prenom,
	role,
	audit: null,
})

let identifiant = 0
const saisie = (utilisateurId: number, tacheId: number, duree: number): Saisie => ({
	id: ++identifiant,
	version: 0,
	utilisateurId,
	tacheId,
	jour: "2026-10-05",
	duree,
	commentaire: null,
	audit: null,
})

describe("projets de la page Équipe", () => {
	const projets = [
		projet(1, "ZZZ", "MANAGER"),
		projet(2, "AAA", "BACKUP"),
		projet(3, "CTR", "CONTRIBUTEUR"),
		projet(4, "HORS", null),
	]

	it("propose les projets dont on est responsable ou suppléant, triés par code", () => {
		expect(projetsPourEquipe(projets, false).map((p) => p.code)).toEqual(["AAA", "ZZZ"])
	})

	it("propose tous les projets à l'administrateur", () => {
		expect(projetsPourEquipe(projets, true).map((p) => p.code)).toEqual(["AAA", "CTR", "HORS", "ZZZ"])
	})

	it("reconnaît les rôles de responsable", () => {
		expect(estResponsable("MANAGER")).toBe(true)
		expect(estResponsable("BACKUP")).toBe(true)
		expect(estResponsable("CONTRIBUTEUR")).toBe(false)
		expect(estResponsable(null)).toBe(false)
	})
})

describe("calculerRecapitulatif", () => {
	const membres = [membre(7, "Paul", "Martin", "CONTRIBUTEUR"), membre(5, "Jean", "Dupont", "MANAGER")]
	const libelleTache = (id: number) => (id === 8 ? "Dev" : "Tests")

	it("totalise par membre (0 h compris, anciens membres ensuite), par tâche et pour le projet", () => {
		const recapitulatif = calculerRecapitulatif(
			[saisie(5, 8, 7), saisie(5, 9, 1.5), saisie(12, 8, 3), saisie(5, 8, 0.5)],
			membres,
			libelleTache,
		)

		expect(recapitulatif.parMembre).toEqual([
			{ utilisateurId: 5, nom: "Jean Dupont", role: "MANAGER", total: 9 },
			{ utilisateurId: 7, nom: "Paul Martin", role: "CONTRIBUTEUR", total: 0 },
			{ utilisateurId: 12, nom: "Ancien membre (n° 12)", role: null, total: 3 },
		])
		expect(recapitulatif.parTache).toEqual([
			{ tacheId: 8, libelle: "Dev", total: 10.5 },
			{ tacheId: 9, libelle: "Tests", total: 1.5 },
		])
		expect(recapitulatif.total).toBe(12)
	})

	it("liste les membres à 0 h sans saisie dans le mois", () => {
		const recapitulatif = calculerRecapitulatif([], membres, libelleTache)

		expect(recapitulatif.parMembre.map((m) => m.total)).toEqual([0, 0])
		expect(recapitulatif.parTache).toEqual([])
		expect(recapitulatif.total).toBe(0)
	})
})
