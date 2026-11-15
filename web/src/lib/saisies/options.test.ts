import { describe, expect, it } from "vitest"

import type { Projet } from "@/lib/api/modeles"

import { libellesDesTaches, projetsPourSaisie } from "./options"

const projet = (id: number, actif: boolean, monRole: Projet["monRole"]): Projet => ({
	id,
	version: 0,
	code: `P${id}`,
	nom: `Projet ${id}`,
	description: null,
	dateDebut: null,
	dateFin: null,
	actif,
	monRole,
	audit: null,
})

describe("projetsPourSaisie", () => {
	it("ouvre à la saisie un projet actif dont l'utilisateur est membre, quel que soit son rôle", () => {
		expect(projetsPourSaisie([projet(1, true, "CONTRIBUTEUR")])[0].ouvert).toBe(true)
		expect(projetsPourSaisie([projet(1, true, "MANAGER")])[0].ouvert).toBe(true)
	})

	it("ferme un projet inactif, ou dont l'utilisateur (administrateur) n'est pas membre", () => {
		expect(projetsPourSaisie([projet(1, false, "MANAGER")])[0].ouvert).toBe(false)
		expect(projetsPourSaisie([projet(1, true, null)])[0].ouvert).toBe(false)
	})
})

describe("libellesDesTaches", () => {
	const libelle = libellesDesTaches(
		[{ id: 1, code: "PJT001" }],
		[{ id: 8, projetId: 1, libelle: "Dev", actif: false }],
	)

	it("préfixe la tâche par le code de son projet, même désactivée", () => {
		expect(libelle(8)).toBe("PJT001 · Dev")
	})

	it("désigne par son numéro une tâche qui n'est plus visible", () => {
		expect(libelle(99)).toBe("Tâche n° 99")
	})
})
