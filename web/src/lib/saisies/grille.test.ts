import { describe, expect, it } from "vitest"

import type { Cloture, Saisie } from "@/lib/api/modeles"

import {
	calculerGrille,
	cumulDeLaSemaine,
	estCloture,
	moisClotures,
	saisiesAPreremplir,
	saisiesARecopierDuLundi,
} from "./grille"
import { lireSemaine } from "./semaine"

let identifiant = 0
const saisie = (tacheId: number, jour: string, duree: number, commentaire: string | null = null): Saisie => ({
	id: ++identifiant,
	version: 0,
	utilisateurId: 7,
	tacheId,
	jour,
	duree,
	commentaire,
	audit: null,
})

const libelles: Record<number, string> = { 1: "PJT001 · Dev", 2: "ABC · Tests" }
const libelleTache = (id: number) => libelles[id]
const semaine = lireSemaine("2026-11-09", "2026-11-09")

describe("calculerGrille", () => {
	it("cumule par tâche et par jour, plusieurs saisies d'une même case comprises", () => {
		const grille = calculerGrille(
			[
				saisie(1, "2026-11-09", 3.5),
				saisie(1, "2026-11-09", 3.5),
				saisie(1, "2026-11-10", 2),
				saisie(2, "2026-11-10", 5),
			],
			libelleTache,
		)

		expect(grille.lignes).toEqual([
			{ tacheId: 2, libelle: "ABC · Tests", parJour: { "2026-11-10": 5 }, total: 5 },
			{ tacheId: 1, libelle: "PJT001 · Dev", parJour: { "2026-11-09": 7, "2026-11-10": 2 }, total: 9 },
		])
		expect(grille.totauxParJour).toEqual({ "2026-11-09": 7, "2026-11-10": 7 })
		expect(grille.totalSemaine).toBe(14)
	})

	it("donne une grille vide sans saisie", () => {
		expect(calculerGrille([], libelleTache)).toEqual({ lignes: [], totauxParJour: {}, totalSemaine: 0 })
	})
})

describe("cumulDeLaSemaine", () => {
	it("donne le total de chaque jour de la semaine, 0 h pour un jour vide, rien hors de la semaine", () => {
		const cumul = cumulDeLaSemaine(semaine, { "2026-11-10": 7.5, "2026-11-16": 4 })

		expect(Object.keys(cumul)).toEqual(semaine.jours)
		expect(cumul["2026-11-10"]).toBe(7.5)
		expect(cumul["2026-11-09"]).toBe(0)
		expect(cumul).not.toHaveProperty("2026-11-16")
	})
})

describe("mois clôturés", () => {
	const clotures = moisClotures([
		{ id: 1, version: 0, projetId: 3, mois: "2026-10", audit: null } satisfies Cloture,
	])

	it("reconnaît un jour d'un mois clôturé pour son projet", () => {
		expect(estCloture(clotures, 3, "2026-10-31")).toBe(true)
	})

	it("laisse ouverts un autre mois ou un autre projet", () => {
		expect(estCloture(clotures, 3, "2026-11-02")).toBe(false)
		expect(estCloture(clotures, 4, "2026-10-31")).toBe(false)
	})
})

describe("saisiesAPreremplir", () => {
	it("recrée chaque saisie une semaine plus tard, dans l'ordre des jours, avec son commentaire", () => {
		expect(
			saisiesAPreremplir([saisie(2, "2026-11-04", 5, "Recette"), saisie(1, "2026-11-02", 7)]),
		).toEqual([
			{ tacheId: 1, jour: "2026-11-09", duree: 7, commentaire: null },
			{ tacheId: 2, jour: "2026-11-11", duree: 5, commentaire: "Recette" },
		])
	})
})

describe("saisiesARecopierDuLundi", () => {
	it("recopie le lundi sur chaque jour vide du mardi au vendredi", () => {
		const aCreer = saisiesARecopierDuLundi(semaine, [
			saisie(1, "2026-11-09", 4, "Matin"),
			saisie(2, "2026-11-09", 3),
			saisie(1, "2026-11-11", 7),
		])

		expect(aCreer.map((s) => s.jour)).toEqual([
			"2026-11-10",
			"2026-11-10",
			"2026-11-12",
			"2026-11-12",
			"2026-11-13",
			"2026-11-13",
		])
		expect(aCreer[0]).toEqual({ tacheId: 1, jour: "2026-11-10", duree: 4, commentaire: "Matin" })
	})

	it("ne touche pas le week-end", () => {
		const aCreer = saisiesARecopierDuLundi(semaine, [saisie(1, "2026-11-09", 4)])

		expect(aCreer.some((s) => s.jour === "2026-11-14" || s.jour === "2026-11-15")).toBe(false)
	})

	it("ne recopie rien sans saisie le lundi ou quand tous les jours sont remplis", () => {
		expect(saisiesARecopierDuLundi(semaine, [saisie(1, "2026-11-10", 4)])).toEqual([])
		expect(
			saisiesARecopierDuLundi(
				semaine,
				["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"].map((jour) =>
					saisie(1, jour, 7),
				),
			),
		).toEqual([])
	})
})
