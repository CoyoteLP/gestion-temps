import { describe, expect, it } from "vitest"

import { messageErreurConnexion } from "./erreurs-connexion"

describe("messageErreurConnexion", () => {
	it("signale un service de connexion indisponible", () => {
		expect(messageErreurConnexion("fournisseur")).toBe(
			"Le service de connexion ne répond pas. Réessayez dans quelques instants.",
		)
	})

	it("signale une connexion expirée ou interrompue", () => {
		expect(messageErreurConnexion("expiree")).toBe(
			"La connexion a expiré ou a été interrompue. Veuillez recommencer.",
		)
	})

	it("signale un accès refusé", () => {
		expect(messageErreurConnexion("refus")).toBe("L'accès vous a été refusé.")
	})

	it("lit la première valeur d'un paramètre répété", () => {
		expect(messageErreurConnexion(["refus", "fournisseur"])).toBe("L'accès vous a été refusé.")
	})

	it.each(["Configuration", "CodeInconnu", "toString", "__proto__"])(
		"affiche un message générique pour un code non prévu : %s",
		(code) => {
			expect(messageErreurConnexion(code)).toBe("La connexion a échoué. Veuillez réessayer.")
		},
	)

	it.each([undefined, "", []])("n'affiche rien sans code d'erreur : %s", (code) => {
		expect(messageErreurConnexion(code)).toBeNull()
	})
})
