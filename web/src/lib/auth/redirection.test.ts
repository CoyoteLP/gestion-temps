import { describe, expect, it } from "vitest"

import { PAGE_ACCUEIL } from "@/lib/constantes"

import { cheminDeRetour } from "./redirection"

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
