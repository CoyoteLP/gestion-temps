import { describe, expect, it } from "vitest"

import { messageErreurConnexion } from "./erreurs-connexion"

describe("messageErreurConnexion", () => {
	it("signale un service de connexion indisponible pour une erreur de configuration", () => {
		expect(messageErreurConnexion("Configuration")).toBe(
			"Le service de connexion ne répond pas. Réessayez dans quelques instants.",
		)
	})

	it("signale un accès refusé", () => {
		expect(messageErreurConnexion("AccessDenied")).toBe("L'accès vous a été refusé.")
	})

	it("lit la première valeur d'un paramètre répété", () => {
		expect(messageErreurConnexion(["AccessDenied", "Configuration"])).toBe("L'accès vous a été refusé.")
	})

	it.each(["Verification", "CodeInconnu", "toString", "__proto__"])(
		"affiche un message générique pour un code non prévu : %s",
		(code) => {
			expect(messageErreurConnexion(code)).toBe("La connexion a échoué. Veuillez réessayer.")
		},
	)

	it.each([undefined, "", []])("n'affiche rien sans code d'erreur : %s", (code) => {
		expect(messageErreurConnexion(code)).toBeNull()
	})
})
