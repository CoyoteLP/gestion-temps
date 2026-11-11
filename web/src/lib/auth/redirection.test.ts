import { describe, expect, it } from "vitest"

import { PAGE_ACCUEIL } from "@/lib/constantes"

import { cheminDepuisUrl, cheminDeRetour } from "./redirection"

describe("cheminDeRetour", () => {
	it.each(["/projets", "/projets?page=2", "/"])("accepte un chemin de l'application : %s", (chemin) => {
		expect(cheminDeRetour(chemin)).toBe(chemin)
	})

	it.each(["//pirate.example", "/\\pirate.example", "https://pirate.example/", "projets", "", null, 42])(
		"refuse une destination hors de l'application : %s",
		(valeur) => {
			expect(cheminDeRetour(valeur)).toBe(PAGE_ACCUEIL)
		},
	)
})

describe("cheminDepuisUrl", () => {
	it("garde le chemin et la requête d'une URL absolue", () => {
		expect(cheminDepuisUrl("http://localhost:3000/projets?page=2")).toBe("/projets?page=2")
	})

	it("ignore l'origine d'une URL externe", () => {
		expect(cheminDepuisUrl("https://pirate.example/projets")).toBe("/projets")
	})

	it.each([undefined, "", ["/projets"]])("ne renvoie rien sans URL exploitable : %s", (valeur) => {
		expect(cheminDepuisUrl(valeur)).toBe("")
	})
})
