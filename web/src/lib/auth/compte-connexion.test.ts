import { describe, expect, it, vi } from "vitest"

import { urlConsoleCompte } from "./compte-connexion"

describe("urlConsoleCompte", () => {
	it("ajoute le chemin de la console à l'émetteur, avec ou sans barre finale", () => {
		vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "http://localhost:8180/realms/gestion-temps/")

		expect(urlConsoleCompte()).toBe("http://localhost:8180/realms/gestion-temps/account")
	})

	it("renvoie null sans émetteur configuré", () => {
		vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "")

		expect(urlConsoleCompte()).toBeNull()
	})
})
