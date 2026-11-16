// @vitest-environment node
import { headers } from "next/headers"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { origineApplication } from "./origine"

vi.mock("next/headers", () => ({ headers: vi.fn() }))

const entetes = (valeurs: Record<string, string>) =>
	vi.mocked(headers).mockResolvedValue(new Headers(valeurs) as never)

beforeEach(() => {
	vi.stubEnv("APP_URL", "")
	vi.stubEnv("NODE_ENV", "development")
	entetes({ host: "localhost:3000" })
})

describe("origineApplication", () => {
	it("prend l'origine de APP_URL, sans chemin ni barre finale, quels que soient les en-têtes", async () => {
		vi.stubEnv("APP_URL", "https://temps.exemple.fr/chemin/")
		entetes({ host: "pirate.example", "x-forwarded-host": "pirate.example" })

		await expect(origineApplication()).resolves.toBe("https://temps.exemple.fr")
	})

	it("la déduit de la requête en développement, sans APP_URL", async () => {
		await expect(origineApplication()).resolves.toBe("http://localhost:3000")

		entetes({ host: "interne:3000", "x-forwarded-proto": "https", "x-forwarded-host": "app.local" })
		await expect(origineApplication()).resolves.toBe("https://app.local")
	})

	it("refuse de la déduire des en-têtes en production : APP_URL est obligatoire", async () => {
		vi.stubEnv("NODE_ENV", "production")
		entetes({ host: "pirate.example" })

		await expect(origineApplication()).rejects.toThrow("APP_URL doit être définie en production")
	})
})
