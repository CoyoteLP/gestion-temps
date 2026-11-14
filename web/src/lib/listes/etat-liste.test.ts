import { describe, expect, it } from "vitest"

import { LISTE_MEMBRES, LISTE_PROJETS, LISTE_UTILISATEURS } from "./definitions"
import { aDesFiltres, lienListe, lireEtatListe, versActif } from "./etat-liste"

describe("lireEtatListe", () => {
	it("lit la page, le tri, le sens et les filtres admis", () => {
		expect(
			lireEtatListe(LISTE_PROJETS, {
				page: "3",
				tri: "nom",
				sens: "desc",
				code: " APP ",
				actif: "inactif",
			}),
		).toEqual({ page: 3, tri: "nom", sens: "desc", filtres: { code: "APP", nom: "", actif: "inactif" } })
	})

	it("ignore une colonne non triable ou inconnue, un sens et une option inconnus", () => {
		expect(lireEtatListe(LISTE_PROJETS, { tri: "monRole", sens: "haut", actif: "peut-etre" })).toEqual({
			page: 1,
			tri: null,
			sens: "asc",
			filtres: { code: "", nom: "", actif: "" },
		})
		expect(lireEtatListe(LISTE_PROJETS, { tri: "description" }).tri).toBeNull()
	})

	it("ignore un filtre texte trop long, que l'API refuserait", () => {
		expect(lireEtatListe(LISTE_PROJETS, { nom: "x".repeat(101) }).filtres.nom).toBe("")
		expect(lireEtatListe(LISTE_PROJETS, { nom: "x".repeat(100) }).filtres.nom).toHaveLength(100)
	})

	it("applique la valeur par défaut d'un filtre à choix", () => {
		expect(lireEtatListe(LISTE_UTILISATEURS, {}).filtres.actif).toBe("inactif")
		expect(lireEtatListe(LISTE_UTILISATEURS, { actif: "tous" }).filtres.actif).toBe("tous")
	})

	it("ne lit que les paramètres préfixés de sa liste", () => {
		const parametres = { tri: "libelle", page: "4", "membres.tri": "role", "membres.role": "BACKUP" }

		expect(lireEtatListe(LISTE_MEMBRES, parametres)).toEqual({
			page: 1,
			tri: "role",
			sens: "asc",
			filtres: { nom: "", email: "", role: "BACKUP" },
		})
	})

	it("retient la première valeur d'un paramètre répété", () => {
		expect(lireEtatListe(LISTE_PROJETS, { tri: ["code", "nom"] }).tri).toBe("code")
	})
})

describe("aDesFiltres", () => {
	it("détecte un filtre qui s'écarte de sa valeur par défaut", () => {
		expect(aDesFiltres(LISTE_PROJETS, lireEtatListe(LISTE_PROJETS, { nom: "app" }))).toBe(true)
		expect(aDesFiltres(LISTE_UTILISATEURS, lireEtatListe(LISTE_UTILISATEURS, { actif: "tous" }))).toBe(
			true,
		)
	})

	it("ne compte ni l'absence de filtre ni une valeur par défaut", () => {
		expect(aDesFiltres(LISTE_PROJETS, lireEtatListe(LISTE_PROJETS, { tri: "nom" }))).toBe(false)
		expect(aDesFiltres(LISTE_UTILISATEURS, lireEtatListe(LISTE_UTILISATEURS, {}))).toBe(false)
	})
})

describe("lienListe", () => {
	it("modifie les paramètres de la liste et la ramène à la page 1", () => {
		expect(
			lienListe("/projets", { page: "3", nom: "app", tri: "code" }, "", { tri: "nom", sens: "desc" }),
		).toBe("/projets?nom=app&tri=nom&sens=desc")
	})

	it("retire un paramètre vide ou nul", () => {
		expect(lienListe("/projets", { nom: "app", actif: "actif" }, "", { nom: null, actif: "" })).toBe(
			"/projets",
		)
	})

	it("conserve les paramètres de l'autre liste de la page", () => {
		expect(
			lienListe("/projets/3", { page: "2", libelle: "rec", "membres.page": "4" }, "membres.", {
				role: "BACKUP",
			}),
		).toBe("/projets/3?page=2&libelle=rec&membres.role=BACKUP")
	})

	it("accepte les paramètres du navigateur et ne confond pas un nom hérité", () => {
		expect(lienListe("/projets", new URLSearchParams("toString=1&nom=a"), "", { nom: "b" })).toBe(
			"/projets?toString=1&nom=b",
		)
	})
})

describe("versActif", () => {
	it.each([
		["actif", true],
		["inactif", false],
		["tous", undefined],
		["", undefined],
		[undefined, undefined],
	])("traduit %s pour l'API", (valeur, attendu) => {
		expect(versActif(valeur)).toBe(attendu)
	})
})
