// @vitest-environment node
import { describe, expect, it } from "vitest"

import { enTeteHsts, genererNonce, politiqueContenu } from "./en-tetes"
import { EN_TETES_FIXES } from "./en-tetes-fixes"

const directives = (csp: string) =>
	Object.fromEntries(
		csp.split("; ").map((directive) => {
			const [nom, ...valeurs] = directive.split(" ")
			return [nom, valeurs.join(" ")]
		}),
	)

const production = { nonce: "abc", developpement: false, https: true }

describe("politiqueContenu", () => {
	it("n'autorise que les scripts portant le nonce, sans eval ni script en ligne en production", () => {
		const csp = directives(politiqueContenu(production))

		expect(csp["script-src"]).toBe("'self' 'nonce-abc' 'strict-dynamic'")
		expect(csp["script-src"]).not.toContain("unsafe")
		expect(csp["object-src"]).toBe("'none'")
		expect(csp["base-uri"]).toBe("'self'")
	})

	it("interdit l'affichage du site dans un cadre", () => {
		expect(directives(politiqueContenu(production))["frame-ancestors"]).toBe("'none'")
	})

	it("autorise eval en développement seulement (messages d'erreur de React)", () => {
		expect(directives(politiqueContenu({ ...production, developpement: true }))["script-src"]).toContain(
			"'unsafe-eval'",
		)
	})

	it("laisse les formulaires partir vers le fournisseur OIDC (connexion sans JavaScript)", () => {
		const csp = politiqueContenu({
			...production,
			emetteurOidc: "https://auth.exemple.fr/realms/gestion-temps",
		})

		expect(directives(csp)["form-action"]).toBe("'self' https://auth.exemple.fr")
	})

	it("limite les formulaires à l'application sans fournisseur ou avec une adresse invalide", () => {
		expect(directives(politiqueContenu(production))["form-action"]).toBe("'self'")
		expect(
			directives(politiqueContenu({ ...production, emetteurOidc: "pas une url" }))["form-action"],
		).toBe("'self'")
	})

	it("convertit les ressources HTTP en HTTPS, pas en HTTP local", () => {
		expect(politiqueContenu(production)).toContain("upgrade-insecure-requests")
		expect(politiqueContenu({ ...production, https: false })).not.toContain("upgrade-insecure-requests")
	})
})

describe("genererNonce", () => {
	it("donne une valeur aléatoire de 128 bits, différente à chaque appel", () => {
		const nonce = genererNonce()

		expect(Buffer.from(nonce, "base64")).toHaveLength(16)
		expect(genererNonce()).not.toBe(nonce)
	})
})

describe("enTeteHsts", () => {
	it("impose le HTTPS pendant un an quand l'application est en https", () => {
		expect(enTeteHsts("https://temps.exemple.fr")).toBe("max-age=31536000")
	})

	it.each([undefined, "", "http://localhost:3000"])("n'impose rien sans HTTPS (%s)", (url) => {
		expect(enTeteHsts(url)).toBeNull()
	})
})

describe("EN_TETES_FIXES", () => {
	it("pose les en-têtes de sécurité de toutes les réponses", () => {
		expect(Object.fromEntries(EN_TETES_FIXES.map(({ key, value }) => [key, value]))).toEqual({
			"X-Content-Type-Options": "nosniff",
			"Referrer-Policy": "strict-origin-when-cross-origin",
			"X-Frame-Options": "DENY",
			"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
			"Cross-Origin-Opener-Policy": "same-origin",
		})
	})
})
