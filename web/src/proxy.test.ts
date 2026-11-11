import { describe, expect, it, vi } from "vitest"

import { config } from "./proxy"

// Seule la configuration est testée : Auth.js n'est pas chargé
vi.mock("@/auth", () => ({ auth: vi.fn() }))

/** Équivalent du motif tel que Next.js l'applique au chemin de la requête. */
const motif = new RegExp(`^${config.matcher[0]}$`)

describe("config.matcher du proxy", () => {
	it.each([
		"/",
		"/projets",
		"/projets?page=2",
		"/profil",
		"/connexions-actives",
		"/connexion-admin",
		"/api/authentification",
		"/api/projets",
		"/favicon.ico.html",
	])("protège %s", (chemin) => {
		expect(motif.test(chemin.split("?")[0])).toBe(true)
	})

	it.each([
		"/connexion",
		"/connexion/",
		"/api/auth",
		"/api/auth/callback/keycloak",
		"/api/auth/session",
		"/_next/static/chunks/app.js",
		"/_next/image",
		"/favicon.ico",
	])("laisse passer sans session %s", (chemin) => {
		expect(motif.test(chemin)).toBe(false)
	})
})
